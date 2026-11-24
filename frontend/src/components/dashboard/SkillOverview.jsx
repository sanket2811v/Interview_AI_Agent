import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card.jsx';

export function SkillOverview({ skills = [] }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Skill Proficiency Overview</CardTitle>
        <CardDescription>
          AI-evaluated competencies based on question practice and mock rounds
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 pt-2">
        {skills.map((skill) => (
          <div key={skill.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {skill.name}
              </span>
              <span className="font-mono font-semibold text-slate-500 dark:text-slate-400">
                {skill.proficiency}%
              </span>
            </div>
            
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${skill.proficiency}%`,
                  backgroundColor: skill.color || '#7C3AED'
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default SkillOverview;

