import { PrismaClient } from '../src/generated/prisma-client/index.js';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

/**
 * Idempotent Phase 4 Seed Script for InterviewAI
 * Can be safely executed multiple times without generating duplicates or touching user sessions.
 */
async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PRODUCTION) {
    console.log('⚠️ Seeding skipped: Development seed data is blocked in production environment.');
    return;
  }

  console.log('🌱 Starting InterviewAI Phase 4 Database Seeding...');

  // 1. Ensure a standard demonstration candidate user exists for development
  const demoEmail = 'candidate.demo@interviewai.dev';
  const hashedPassword = await hashPassword('DemoP@ssw0rd2026!');

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      name: 'Alex Rivera (Demo)',
      password: hashedPassword,
      isEmailVerified: true,
      isActive: true,
      profile: {
        create: {
          fullName: 'Alex Rivera',
          headline: 'Senior Full Stack Engineer | React & Node.js Specialist',
          currentRole: 'Full Stack Engineer',
          experience: '6 Years',
          location: 'San Francisco, CA (Remote)',
          bio: 'Passionate software engineer experienced in architecting scalable web applications, real-time distributed systems, and modern AI-enhanced developer platforms.',
          preferredJobRole: 'Staff Full Stack Engineer',
          skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'System Design', 'Redis', 'Docker']
        }
      }
    }
  });

  console.log(`✅ Demo User ready: ${demoUser.email} (${demoUser.id})`);

  // 2. Seed Sample Preparation Sessions (Full Stack, Backend, Frontend)
  const session1 = await prisma.preparationSession.upsert({
    where: { id: 'seed-session-fullstack-001' },
    update: {},
    create: {
      id: 'seed-session-fullstack-001',
      userId: demoUser.id,
      title: 'Senior Full Stack Engineer Preparation',
      companyName: 'TechCorp Labs',
      jobTitle: 'Senior Full Stack Engineer',
      experienceLevel: 'SENIOR',
      preferredLanguage: 'JavaScript',
      difficulty: 'HARD',
      status: 'READY',
      progress: 65,
      jobDescription: {
        create: {
          rawText: `TechCorp Labs is seeking a Senior Full Stack Engineer to lead architecture across our React dashboard and Express microservices. Must have deep experience with React 18, Node.js concurrency, PostgreSQL query optimization, and REST API design. Knowledge of distributed caching with Redis and system design is required.`,
          sourceType: 'PASTED_TEXT'
        }
      },
      jobAnalysis: {
        create: {
          jobTitle: 'Senior Full Stack Engineer',
          companyName: 'TechCorp Labs',
          seniorityLevel: 'Senior (5-8 years)',
          requiredExperience: '5+ years full-stack development',
          responsibilities: [
            'Architect scalable frontend dashboards and responsive user experiences with React',
            'Design and maintain high-performance Express RESTful API services',
            'Optimize PostgreSQL relational schemas, indexes, and queries',
            'Conduct system design reviews and mentor mid-level engineers'
          ],
          requiredSkills: ['React', 'Node.js', 'Express', 'PostgreSQL', 'JavaScript / TypeScript'],
          preferredSkills: ['Redis', 'System Design', 'Docker', 'Prisma ORM'],
          technicalSkills: ['State Management', 'REST API Architecture', 'Database Indexing', 'Concurrency'],
          softSkills: ['Cross-functional Collaboration', 'Technical Mentorship', 'Problem Solving'],
          technologies: ['React 18', 'Node.js 20+', 'PostgreSQL 16', 'Tailwind CSS', 'Vite'],
          qualifications: ["Bachelor's in CS or equivalent practical experience", '5+ years production engineering'],
          interviewDifficulty: 'HARD',
          skillGapAnalysis: {
            matchingSkills: ['React', 'Node.js', 'PostgreSQL', 'JavaScript'],
            recommendedFocus: ['Distributed System Design', 'High Concurrency Database Indexing']
          }
        }
      }
    }
  });

  const session2 = await prisma.preparationSession.upsert({
    where: { id: 'seed-session-backend-002' },
    update: {},
    create: {
      id: 'seed-session-backend-002',
      userId: demoUser.id,
      title: 'Lead Backend Engineer Preparation',
      companyName: 'CloudScale Systems',
      jobTitle: 'Lead Backend Architect',
      experienceLevel: 'LEAD',
      preferredLanguage: 'JavaScript',
      difficulty: 'EXPERT',
      status: 'READY',
      progress: 40,
      jobDescription: {
        create: {
          rawText: `CloudScale Systems is hiring a Lead Backend Architect to scale distributed data pipelines and high-throughput microservices. Deep expertise in Node.js, PostgreSQL clustering, transaction isolation, and secure authentication is paramount.`,
          sourceType: 'PASTED_TEXT'
        }
      }
    }
  });

  console.log('✅ Preparation Sessions seeded with Job Descriptions and AI Analyses.');

  // 3. Seed Comprehensive Curated Interview Questions
  const questions = [
    {
      id: 'seed-q-js-event-loop-01',
      preparationSessionId: session1.id,
      category: 'TECHNICAL',
      difficulty: 'MEDIUM',
      question: 'Explain the Node.js Event Loop phases and how microtasks (process.nextTick, Promise callbacks) differ from macrotasks.',
      description: 'Core runtime architecture question assessing deep understanding of Node.js single-threaded asynchronous non-blocking I/O.',
      expectedConcepts: ['Timers', 'Pending Callbacks', 'Poll Phase', 'Check Phase (setImmediate)', 'Microtask Queue Priority'],
      hints: ['Microtasks drain immediately after the current operation finishes before the loop proceeds to the next phase.'],
      referenceAnswer: 'The Node.js event loop orchestrates non-blocking I/O across phases: Timers, Pending callbacks, Idle/Prepare, Poll, Check (setImmediate), and Close callbacks. Between every phase and every tick, the microtask queue (process.nextTick followed by resolved Promise callbacks) is completely drained before moving to the next phase.',
      estimatedTime: 5,
      displayOrder: 1,
      tags: ['Node.js', 'Event Loop', 'Asynchronous', 'JavaScript Engine']
    },
    {
      id: 'seed-q-react-hooks-02',
      preparationSessionId: session1.id,
      category: 'TECHNICAL',
      difficulty: 'MEDIUM',
      question: 'How do useEffect dependencies work, and how can stale closures occur in asynchronous callbacks within hooks?',
      description: 'Examines component lifecycle, memoization, and closure capture semantics in React functional components.',
      expectedConcepts: ['Object.is comparison', 'Stale closure capture', 'useCallback dependency array', 'Functional state updater'],
      hints: ['Passing a function to setState (prev => prev + 1) reads current state without closing over stale values.'],
      referenceAnswer: 'React checks useEffect dependencies using Object.is shallow comparison. If a callback inside useEffect references state without listing it in dependencies or without using a functional state updater, the function captures the variable from its initial render lexical scope, resulting in a stale closure.',
      estimatedTime: 5,
      displayOrder: 2,
      tags: ['React', 'Hooks', 'useEffect', 'Closures']
    },
    {
      id: 'seed-q-pg-indexing-03',
      preparationSessionId: session1.id,
      category: 'TECHNICAL',
      difficulty: 'HARD',
      question: 'When should you use composite B-Tree indexes in PostgreSQL, and how does column ordering affect query performance?',
      description: 'Evaluates relational database performance tuning, index seek behavior, and query optimizer selectivity.',
      expectedConcepts: ['Leftmost prefix rule', 'Index selectivity', 'Covering indexes (INCLUDE clause)', 'B-Tree traversal'],
      hints: ['Place the most selective equality filter columns first, followed by range or sort columns.'],
      referenceAnswer: 'A composite index on (A, B) is indexed primarily on A, and then on B within identical values of A. Queries filtering by A alone or A AND B can seek the index efficiently, but a query filtering only by B cannot leverage the index directly. Place the most selective equality columns first and range/sort columns last.',
      estimatedTime: 6,
      displayOrder: 3,
      tags: ['PostgreSQL', 'Indexing', 'B-Tree', 'Performance Tuning']
    },
    {
      id: 'seed-q-hr-conflict-04',
      preparationSessionId: session1.id,
      category: 'HR',
      difficulty: 'MEDIUM',
      question: 'Tell me about a time you strongly disagreed with a technical decision made by a peer or manager. How did you handle it?',
      description: 'Behavioral question structured around the STAR (Situation, Task, Action, Result) framework assessing professional communication and consensus-building.',
      expectedConcepts: ['STAR Method', 'Objective Data & Trade-offs', 'Disagree and Commit', 'Professional Empathy'],
      hints: ['Structure using Situation -> Task -> Action -> Result, focusing on data and mutual respect.'],
      referenceAnswer: 'Situation: During a microservices migration, our lead proposed an unproven in-memory queue. Task: Ensure reliable message delivery under network partitions. Action: Benchmarked throughput vs persistence guarantees, created a trade-off matrix, and held an objective discussion. Result: Selected a proven queue (RabbitMQ) with 99.99% uptime, delivered on schedule with team alignment.',
      estimatedTime: 5,
      displayOrder: 4,
      tags: ['Behavioral', 'STAR Method', 'Conflict Resolution', 'Leadership']
    },
    {
      id: 'seed-q-sys-design-rate-limiter-05',
      preparationSessionId: session1.id,
      category: 'SYSTEM_DESIGN',
      difficulty: 'HARD',
      question: 'Design a distributed rate limiter that can handle 100,000 requests per second across multiple data centers with low latency.',
      description: 'Classic high-scale system design question evaluating algorithmic trade-offs (Token Bucket, Leaky Bucket, Sliding Window Counter) and Redis concurrency.',
      expectedConcepts: ['Token Bucket Algorithm', 'Redis Lua Scripts', 'Sliding Window Log vs Counter', 'Multi-DC Consistency'],
      hints: ['Atomic Lua scripts in Redis prevent race conditions between read and increment.'],
      referenceAnswer: 'Use a Sliding Window Counter algorithm backed by Redis clusters. An atomic Lua script calculates window boundaries and increments hits in one round-trip. At high scale across multi-region data centers, use local memory limiters with periodic synchronization or token buckets to minimize cross-region latency.',
      estimatedTime: 10,
      displayOrder: 5,
      tags: ['System Design', 'Rate Limiting', 'Redis', 'High Availability']
    }
  ];

  for (const q of questions) {
    await prisma.interviewQuestion.upsert({
      where: { id: q.id },
      update: {},
      create: q
    });
  }

  console.log(`✅ ${questions.length} Curated Interview Questions seeded.`);

  // 4. Seed Standard Coding Challenges
  const challenges = [
    {
      id: 'seed-challenge-two-sum-01',
      preparationSessionId: session1.id,
      title: 'Two Sum',
      category: 'Arrays & Hashing',
      difficulty: 'EASY',
      description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9', 'Only one valid answer exists.'],
      sampleInput: 'nums = [2,7,11,15], target = 9',
      sampleOutput: '[0,1]',
      hints: ['Use a hash map to look up the complement (target - nums[i]) in O(1) time.'],
      expectedTimeComplexity: 'O(n)',
      expectedSpaceComplexity: 'O(n)',
      timeLimit: 1000,
      memoryLimit: 128,
      testCases: [
        { id: 'seed-tc-two-sum-01', input: JSON.stringify({ nums: [2, 7, 11, 15], target: 9 }), expectedOutput: '[0,1]', isHidden: false, displayOrder: 1 },
        { id: 'seed-tc-two-sum-02', input: JSON.stringify({ nums: [3, 2, 4], target: 6 }), expectedOutput: '[1,2]', isHidden: false, displayOrder: 2 },
        { id: 'seed-tc-two-sum-03', input: JSON.stringify({ nums: [3, 3], target: 6 }), expectedOutput: '[0,1]', isHidden: true, displayOrder: 3 }
      ]
    },
    {
      id: 'seed-challenge-valid-parentheses-02',
      preparationSessionId: session1.id,
      title: 'Valid Parentheses',
      category: 'Stacks',
      difficulty: 'EASY',
      description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid. Open brackets must be closed by the same type of brackets and in the correct order.',
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      constraints: ['1 <= s.length <= 10^4', 's consists of parentheses only ()[]{}'],
      sampleInput: 's = "()[]{}"',
      sampleOutput: 'true',
      hints: ['Use a LIFO stack to store opening brackets and match them against incoming closing brackets.'],
      expectedTimeComplexity: 'O(n)',
      expectedSpaceComplexity: 'O(n)',
      timeLimit: 1000,
      memoryLimit: 128,
      testCases: [
        { id: 'seed-tc-valid-paren-01', input: '"()"', expectedOutput: 'true', isHidden: false, displayOrder: 1 },
        { id: 'seed-tc-valid-paren-02', input: '"()[]{}"', expectedOutput: 'true', isHidden: false, displayOrder: 2 },
        { id: 'seed-tc-valid-paren-03', input: '"(]"', expectedOutput: 'false', isHidden: true, displayOrder: 3 }
      ]
    },
    {
      id: 'seed-challenge-max-subarray-03',
      preparationSessionId: session1.id,
      title: 'Maximum Subarray',
      category: 'Dynamic Programming',
      difficulty: 'MEDIUM',
      description: "Given an integer array `nums`, find the subarray with the largest sum, and return its sum (Kadane's Algorithm).",
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
      sampleInput: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
      sampleOutput: '6',
      hints: ["Keep a running currentSum. If currentSum becomes negative, reset it to 0 (Kadane's Algorithm)."],
      expectedTimeComplexity: 'O(n)',
      expectedSpaceComplexity: 'O(1)',
      timeLimit: 1500,
      memoryLimit: 128,
      testCases: [
        { id: 'seed-tc-max-sub-01', input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false, displayOrder: 1 },
        { id: 'seed-tc-max-sub-02', input: '[1]', expectedOutput: '1', isHidden: false, displayOrder: 2 },
        { id: 'seed-tc-max-sub-03', input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: true, displayOrder: 3 }
      ]
    },
    {
      id: 'seed-challenge-binary-search-04',
      preparationSessionId: session1.id,
      title: 'Binary Search',
      category: 'Binary Search',
      difficulty: 'EASY',
      description: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return -1.',
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      constraints: ['1 <= nums.length <= 10^4', '-10^4 < nums[i], target < 10^4', 'All integers in nums are unique and sorted in ascending order.'],
      sampleInput: 'nums = [-1,0,3,5,9,12], target = 9',
      sampleOutput: '4',
      hints: ['Maintain left and right pointers. Set mid = left + Math.floor((right - left) / 2) to avoid overflow.'],
      expectedTimeComplexity: 'O(log n)',
      expectedSpaceComplexity: 'O(1)',
      timeLimit: 1000,
      memoryLimit: 128,
      testCases: [
        { id: 'seed-tc-bin-search-01', input: JSON.stringify({ nums: [-1, 0, 3, 5, 9, 12], target: 9 }), expectedOutput: '4', isHidden: false, displayOrder: 1 },
        { id: 'seed-tc-bin-search-02', input: JSON.stringify({ nums: [-1, 0, 3, 5, 9, 12], target: 2 }), expectedOutput: '-1', isHidden: true, displayOrder: 2 }
      ]
    }
  ];

  for (const c of challenges) {
    const { testCases, ...challengeData } = c;
    const challengeRecord = await prisma.codingChallenge.upsert({
      where: { id: c.id },
      update: {},
      create: challengeData
    });

    for (const tc of testCases) {
      await prisma.codingTestCase.upsert({
        where: { id: tc.id },
        update: {},
        create: {
          id: tc.id,
          challengeId: challengeRecord.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
          displayOrder: tc.displayOrder
        }
      });
    }
  }

  console.log(`✅ ${challenges.length} Coding Challenges and Test Cases seeded.`);

  // 5. Seed Improvement Plan & Personalized Learning Tasks
  const plan = await prisma.improvementPlan.upsert({
    where: { id: 'seed-plan-alex-001' },
    update: {},
    create: {
      id: 'seed-plan-alex-001',
      userId: demoUser.id,
      preparationSessionId: session1.id,
      title: 'Targeted Senior Engineer Competency Roadmap',
      description: 'Actionable 14-day study sprint focused on distributed caching, PostgreSQL indexing, and STAR behavioral leadership.',
      status: 'ACTIVE',
      completionPercentage: 45
    }
  });

  const tasks = [
    {
      id: 'seed-task-alex-001',
      improvementPlanId: plan.id,
      title: 'Master Node.js Event Loop & Microtask Priority',
      description: 'Study libuv thread pool mechanics, process.nextTick vs setImmediate, and write sample benchmarks.',
      category: 'Node.js Internals',
      priority: 'HIGH',
      status: 'COMPLETED',
      estimatedMinutes: 45,
      completedAt: new Date()
    },
    {
      id: 'seed-task-alex-002',
      improvementPlanId: plan.id,
      title: 'Analyze PostgreSQL Composite B-Tree Selectivity',
      description: 'Execute EXPLAIN ANALYZE on multi-column queries and benchmark leftmost prefix scanning.',
      category: 'Database Optimization',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      estimatedMinutes: 60,
      dueDate: new Date(Date.now() + 2 * 86400 * 1000)
    },
    {
      id: 'seed-task-alex-003',
      improvementPlanId: plan.id,
      title: 'Practice STAR Leadership Responses for Conflict Questions',
      description: 'Record audio responses answering 3 behavioral scenario questions and review AI evaluation scores.',
      category: 'HR & Behavioral',
      priority: 'MEDIUM',
      status: 'PENDING',
      estimatedMinutes: 30,
      dueDate: new Date(Date.now() + 5 * 86400 * 1000)
    }
  ];

  for (const t of tasks) {
    await prisma.learningTask.upsert({
      where: { id: t.id },
      update: {},
      create: t
    });
  }

  console.log(`✅ Improvement Plan ready: "${plan.title}" with ${tasks.length} tasks.`);

  // 6. Seed User Progress Analytics
  const progressSkills = [
    { category: 'TECHNICAL', skillName: 'React & Virtual DOM', totalAttempts: 12, completedAttempts: 12, averageScore: 88.5, proficiencyLevel: 'Advanced' },
    { category: 'TECHNICAL', skillName: 'Node.js & Express', totalAttempts: 15, completedAttempts: 14, averageScore: 91.0, proficiencyLevel: 'Expert' },
    { category: 'TECHNICAL', skillName: 'PostgreSQL Relational Design', totalAttempts: 9, completedAttempts: 8, averageScore: 82.0, proficiencyLevel: 'Advanced' },
    { category: 'CODING', skillName: 'Algorithms & Data Structures', totalAttempts: 20, completedAttempts: 18, averageScore: 85.0, proficiencyLevel: 'Advanced' },
    { category: 'HR', skillName: 'Behavioral & Leadership', totalAttempts: 6, completedAttempts: 6, averageScore: 89.0, proficiencyLevel: 'Advanced' }
  ];

  for (const p of progressSkills) {
    await prisma.userProgress.upsert({
      where: {
        userId_category_skillName: {
          userId: demoUser.id,
          category: p.category,
          skillName: p.skillName
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        category: p.category,
        skillName: p.skillName,
        totalAttempts: p.totalAttempts,
        completedAttempts: p.completedAttempts,
        averageScore: p.averageScore,
        proficiencyLevel: p.proficiencyLevel
      }
    });
  }

  console.log(`✅ ${progressSkills.length} User Skill Proficiency records seeded.`);
  console.log('🎉 Phase 4 Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
