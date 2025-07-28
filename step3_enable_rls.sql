-- 第三步：启用RLS并创建策略
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization memberships"
ON user_organizations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can join organizations"
ON user_organizations FOR INSERT
WITH CHECK (auth.uid() = user_id);