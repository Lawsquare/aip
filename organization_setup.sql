-- 创建用户-组织关联表
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role_in_org TEXT NOT NULL DEFAULT 'member' CHECK (role_in_org IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- 为projects表添加organization_id字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'organization_id') THEN
    ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END $$;

-- 为projects表添加is_public字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'is_public') THEN
    ALTER TABLE projects ADD COLUMN is_public BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 为projects表添加is_recruiting字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'is_recruiting') THEN
    ALTER TABLE projects ADD COLUMN is_recruiting BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 设置RLS策略
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的组织关联
CREATE POLICY "Users can view their own organization memberships"
  ON user_organizations FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以加入组织（插入记录）
CREATE POLICY "Users can join organizations"
  ON user_organizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 组织管理员可以管理成员
CREATE POLICY "Organization admins can manage members"
  ON user_organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.organization_id = user_organizations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.role_in_org = 'admin'
    )
  );

-- 更新projects表的RLS策略，支持组织权限
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Users can view projects" ON projects;

-- 公开项目所有人可见，私有项目仅成员可见
CREATE POLICY "Public projects viewable by everyone, private by members only"
  ON projects FOR SELECT
  USING (
    is_public = true 
    OR 
    (
      auth.uid() IS NOT NULL 
      AND (
        -- 项目创建者
        creator_id = auth.uid()
        OR
        -- 项目成员
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
        )
        OR
        -- 组织成员
        EXISTS (
          SELECT 1 FROM user_organizations uo
          WHERE uo.organization_id = projects.organization_id AND uo.user_id = auth.uid()
        )
      )
    )
  );

-- 创建一些示例数据（可选）
INSERT INTO user_organizations (user_id, organization_id, role_in_org)
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM organizations LIMIT 1),
  'member'
WHERE NOT EXISTS (
  SELECT 1 FROM user_organizations 
  WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
);

-- 更新现有项目，设置默认组织
UPDATE projects 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

COMMENT ON TABLE user_organizations IS '用户-组织关联表，记录用户所属的组织及其角色';
COMMENT ON COLUMN user_organizations.role_in_org IS '用户在组织中的角色：admin（管理员）或 member（成员）';
COMMENT ON COLUMN projects.is_public IS '项目是否公开：true（所有人可见）或 false（仅成员可见）';
COMMENT ON COLUMN projects.is_recruiting IS '项目是否正在招募新成员';
COMMENT ON COLUMN projects.organization_id IS '项目所属的组织ID';