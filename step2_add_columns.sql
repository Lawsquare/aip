-- 第二步：为projects表添加字段
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_recruiting BOOLEAN DEFAULT false NOT NULL;