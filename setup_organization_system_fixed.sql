-- ================================================
-- 组织管理系统数据库设置脚本 (修复版)
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
  UNIQUE(user_id, organization_id)
);

-- 2. 为projects表添加organization_id字段
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 3. 为projects表添加is_public字段
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL;

-- 4. 为projects表添加is_recruiting字段
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_recruiting BOOLEAN DEFAULT false NOT NULL;

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);

-- 6. 启用RLS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- 7. 创建RLS策略 - 用户查看自己的组织关联
CREATE POLICY "Users can view their own organization memberships"
ON user_organizations FOR SELECT
USING (auth.uid() = user_id);

-- 8. 创建RLS策略 - 用户查看同组织成员
CREATE POLICY "Users can view same organization members"
ON user_organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.organization_id = user_organizations.organization_id
    AND uo.user_id = auth.uid()
  )
);

-- 9. 创建RLS策略 - 用户加入组织
CREATE POLICY "Users can join organizations"
ON user_organizations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 10. 创建RLS策略 - 管理员管理成员
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

-- 11. 创建RLS策略 - 管理员删除成员
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

-- 12. 删除projects表的旧策略
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Users can view projects" ON projects;
DROP POLICY IF EXISTS "Public projects viewable by everyone" ON projects;

-- 13. 创建新的项目查看策略
CREATE POLICY "Project visibility based on public status and membership"
ON projects FOR SELECT
USING (
  is_public = true 
  OR 
  (
    auth.uid() IS NOT NULL 
    AND (
      creator_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
      )
      OR
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

-- 14. 更新现有项目的组织关联
UPDATE projects 
SET organization_id = (
  SELECT id FROM organizations 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE organization_id IS NULL 
AND EXISTS (SELECT 1 FROM organizations);

-- 15. 创建触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 16. 添加触发器
DROP TRIGGER IF EXISTS update_user_organizations_updated_at ON user_organizations;
CREATE TRIGGER update_user_organizations_updated_at
BEFORE UPDATE ON user_organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();