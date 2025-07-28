-- ================================================
-- 组织管理系统数据库设置脚本
-- ================================================

-- 1. 创建用户-组织关联表
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role_in_org TEXT NOT NULL DEFAULT 'member' CHECK (role_in_org IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 确保用户在同一组织中只能有一条记录
  UNIQUE(user_id, organization_id)
);

-- 2. 为projects表添加必要字段
-- 添加组织关联字段
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'organization_id') THEN
    ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END $$;

-- 添加项目可见性字段
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'is_public') THEN
    ALTER TABLE projects ADD COLUMN is_public BOOLEAN DEFAULT true NOT NULL;
  END IF;
END $$;

-- 添加招募状态字段
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'is_recruiting') THEN
    ALTER TABLE projects ADD COLUMN is_recruiting BOOLEAN DEFAULT false NOT NULL;
  END IF;
END $$;

-- 3. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);

-- 4. 启用行级安全策略 (RLS)
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- 5. 创建RLS策略

-- 用户可以查看自己的组织关联
CREATE POLICY "Users can view their own organization memberships"
  ON user_organizations FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以查看同组织成员的关联信息
CREATE POLICY "Users can view same organization members"
  ON user_organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
    )
  );

-- 用户可以加入组织（插入自己的记录）
CREATE POLICY "Users can join organizations"
  ON user_organizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 组织管理员可以管理成员
CREATE POLICY "Organization admins can manage members"
  ON user_organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role_in_org = 'admin'
    )
  );

-- 组织管理员可以删除成员
CREATE POLICY "Organization admins can remove members"
  ON user_organizations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role_in_org = 'admin'
    )
  );

-- 6. 更新projects表的RLS策略
-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Users can view projects" ON projects;
DROP POLICY IF EXISTS "Public projects viewable by everyone" ON projects;

-- 创建新的项目查看策略
CREATE POLICY "Project visibility based on public status and membership"
  ON projects FOR SELECT
  USING (
    -- 公开项目所有人都可以看到
    is_public = true 
    OR 
    -- 私有项目需要权限验证
    (
      auth.uid() IS NOT NULL 
      AND (
        -- 项目创建者可以看到
        creator_id = auth.uid()
        OR
        -- 项目成员可以看到
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
        )
        OR
        -- 同组织成员可以看到（如果项目属于组织）
        (
          organization_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM user_organizations uo
            WHERE uo.organization_id = projects.organization_id 
            AND uo.user_id = auth.uid()
          )
        )
      )
    )
  );

-- 7. 为现有数据设置默认值
-- 将没有组织的项目关联到第一个组织（如果存在）
UPDATE projects 
SET organization_id = (
  SELECT id FROM organizations 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE organization_id IS NULL 
AND EXISTS (SELECT 1 FROM organizations);

-- 8. 创建触发器自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为user_organizations表添加触发器
DROP TRIGGER IF EXISTS update_user_organizations_updated_at ON user_organizations;
CREATE TRIGGER update_user_organizations_updated_at
    BEFORE UPDATE ON user_organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. 添加表注释
COMMENT ON TABLE user_organizations IS '用户-组织关联表，记录用户所属的组织及其角色';
COMMENT ON COLUMN user_organizations.user_id IS '用户ID，关联到auth.users表';
COMMENT ON COLUMN user_organizations.organization_id IS '组织ID，关联到organizations表';
COMMENT ON COLUMN user_organizations.role_in_org IS '用户在组织中的角色：admin（管理员）或 member（成员）';
COMMENT ON COLUMN user_organizations.joined_at IS '用户加入组织的时间';

COMMENT ON COLUMN projects.organization_id IS '项目所属的组织ID，关联到organizations表';
COMMENT ON COLUMN projects.is_public IS '项目是否公开：true（所有人可见）或 false（仅成员可见）';
COMMENT ON COLUMN projects.is_recruiting IS '项目是否正在招募新成员';

-- 10. 创建一些示例数据（可选，仅在开发环境使用）
-- 如果你想要一些测试数据，取消下面的注释

/*
-- 示例：将第一个用户添加到第一个组织
INSERT INTO user_organizations (user_id, organization_id, role_in_org)
SELECT 
  (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1),
  (SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1),
  'admin'
WHERE EXISTS (SELECT 1 FROM auth.users) 
  AND EXISTS (SELECT 1 FROM organizations)
  AND NOT EXISTS (
    SELECT 1 FROM user_organizations 
    WHERE organization_id = (SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1)
  );
*/

-- ================================================
-- 脚本执行完成！
-- ================================================

-- 验证表结构
SELECT 
  'user_organizations表已创建' as status,
  count(*) as row_count 
FROM user_organizations;

SELECT 
  'projects表字段已更新' as status,
  count(*) as total_projects,
  count(organization_id) as projects_with_org,
  count(CASE WHEN is_public THEN 1 END) as public_projects
FROM projects;