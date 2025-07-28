DROP POLICY IF EXISTS "Projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Users can view projects" ON projects;

CREATE POLICY "Project visibility based on public status"
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
    )
  )
);