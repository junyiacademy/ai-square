# Learning System Technical Specification

## Overview

This document outlines the technical architecture for AI Square's adaptive learning system, including learning paths, assessment engine, rubrics system, and progress tracking capabilities.

## Architecture Design

### Learning System Architecture
```
┌────────────────────────────────────────────────────────┐
│                  Learning Platform                      │
├────────────────────────────────────────────────────────┤
│              Adaptive Learning Engine                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Path      │  │ Assessment  │  │  Progress   │   │
│  │ Generator   │  │   Engine    │  │  Tracker    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├────────────────────────────────────────────────────────┤
│                 Content Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Rubrics   │  │   Lessons   │  │ Assessments │   │
│  │   System    │  │   Library   │  │    Bank     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├────────────────────────────────────────────────────────┤
│               Analytics Engine                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Learning   │  │ Performance │  │ Predictive  │   │
│  │  Analytics  │  │   Metrics   │  │   Models    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└────────────────────────────────────────────────────────┘
```

## Technical Requirements

### Core Components

1. **Adaptive Learning Path Generator**
   - Dynamic path creation based on learner profile
   - Real-time path adjustment based on performance
   - Multi-modal content recommendation
   - Prerequisite management

2. **Assessment Engine**
   - Multiple question types support
   - Adaptive difficulty adjustment
   - Real-time grading
   - Anti-cheating measures

3. **Rubrics System**
   - Visual rubrics builder
   - Competency mapping
   - Standards alignment
   - Multi-dimensional assessment

4. **Progress Tracking**
   - Real-time progress monitoring
   - Skill gap analysis
   - Achievement system
   - Learning analytics

## Implementation Details

### 1. Learning Path System

```python
# backend/learning/path_generator.py
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import networkx as nx

@dataclass
class LearningNode:
    id: str
    type: str  # lesson, assessment, project, review
    content_id: str
    title: str
    duration_minutes: int
    difficulty: int  # 1-10
    prerequisites: List[str]
    skills: List[str]
    metadata: Dict

@dataclass
class LearnerProfile:
    user_id: str
    current_level: Dict[str, float]  # skill -> proficiency
    learning_style: str
    pace: str  # slow, medium, fast
    availability_hours_per_week: float
    goals: List[str]
    completed_nodes: List[str]
    performance_history: List[Dict]

class AdaptiveLearningPath:
    """Generates and manages personalized learning paths"""
    
    def __init__(self, db_session, ai_service):
        self.db = db_session
        self.ai = ai_service
        self.knowledge_graph = self._build_knowledge_graph()
        
    def generate_path(
        self, 
        profile: LearnerProfile, 
        target_skills: List[str],
        duration_weeks: int = 12
    ) -> List[LearningNode]:
        """Generate personalized learning path"""
        
        # Analyze current proficiency
        skill_gaps = self._analyze_skill_gaps(
            profile.current_level, 
            target_skills
        )
        
        # Build directed graph of learning nodes
        path_graph = nx.DiGraph()
        
        # Add nodes based on skill gaps
        for skill, gap in skill_gaps.items():
            relevant_nodes = self._find_relevant_nodes(
                skill, 
                gap, 
                profile.learning_style
            )
            
            for node in relevant_nodes:
                path_graph.add_node(
                    node.id, 
                    data=node
                )
                
                # Add prerequisite edges
                for prereq in node.prerequisites:
                    if prereq in path_graph:
                        path_graph.add_edge(prereq, node.id)
                        
        # Optimize path based on constraints
        optimal_path = self._optimize_path(
            path_graph,
            profile,
            duration_weeks
        )
        
        # Add adaptive checkpoints
        path_with_checkpoints = self._add_checkpoints(
            optimal_path, 
            profile
        )
        
        return path_with_checkpoints
        
    def adapt_path(
        self, 
        profile: LearnerProfile, 
        current_path: List[LearningNode],
        performance_data: Dict
    ) -> List[LearningNode]:
        """Adapt learning path based on performance"""
        
        # Analyze recent performance
        performance_analysis = self._analyze_performance(
            performance_data
        )
        
        # Identify struggling areas
        struggling_skills = [
            skill for skill, score in performance_analysis.items()
            if score < 0.7
        ]
        
        # Generate remedial content
        if struggling_skills:
            remedial_nodes = self._generate_remedial_content(
                struggling_skills,
                profile
            )
            
            # Insert remedial content into path
            current_position = self._find_current_position(
                profile, 
                current_path
            )
            
            updated_path = (
                current_path[:current_position + 1] +
                remedial_nodes +
                current_path[current_position + 1:]
            )
        else:
            updated_path = current_path
            
        # Check if learner is ahead of schedule
        if performance_analysis.get("average_score", 0) > 0.9:
            # Accelerate path by removing redundant content
            updated_path = self._accelerate_path(
                updated_path, 
                profile
            )
            
        return updated_path
        
    def _analyze_skill_gaps(
        self, 
        current_level: Dict[str, float], 
        target_skills: List[str]
    ) -> Dict[str, float]:
        """Analyze gaps between current and target skills"""
        gaps = {}
        
        for skill in target_skills:
            current = current_level.get(skill, 0.0)
            target = 1.0  # Assume mastery as target
            gaps[skill] = target - current
            
        return gaps
        
    def _optimize_path(
        self, 
        graph: nx.DiGraph, 
        profile: LearnerProfile,
        duration_weeks: int
    ) -> List[LearningNode]:
        """Optimize learning path using graph algorithms"""
        
        # Calculate available learning time
        total_hours = profile.availability_hours_per_week * duration_weeks
        total_minutes = total_hours * 60
        
        # Use topological sort to respect prerequisites
        topo_order = list(nx.topological_sort(graph))
        
        # Dynamic programming to optimize path
        selected_nodes = []
        current_time = 0
        current_skills = profile.current_level.copy()
        
        for node_id in topo_order:
            node = graph.nodes[node_id]["data"]
            
            # Check if node fits in remaining time
            if current_time + node.duration_minutes <= total_minutes:
                # Calculate value of adding this node
                value = self._calculate_node_value(
                    node, 
                    current_skills, 
                    profile.goals
                )
                
                if value > 0.5:  # Threshold for inclusion
                    selected_nodes.append(node)
                    current_time += node.duration_minutes
                    
                    # Update current skills
                    for skill in node.skills:
                        current_skills[skill] = min(
                            1.0, 
                            current_skills.get(skill, 0) + 0.1
                        )
                        
        return selected_nodes
```

### 2. Assessment Engine

```python
# backend/learning/assessment_engine.py
from typing import List, Dict, Optional, Union
from enum import Enum
import random
import asyncio

class QuestionType(Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    CODING = "coding"
    DRAG_DROP = "drag_drop"
    MATCHING = "matching"
    FILL_BLANK = "fill_blank"

@dataclass
class Question:
    id: str
    type: QuestionType
    content: str
    options: Optional[List[str]] = None
    correct_answer: Union[str, List[str], Dict] = None
    explanation: Optional[str] = None
    difficulty: int = 5  # 1-10
    skills: List[str] = None
    time_limit_seconds: Optional[int] = None
    points: float = 1.0
    hints: Optional[List[str]] = None
    media: Optional[Dict] = None  # images, videos, etc.

@dataclass
class AssessmentConfig:
    question_count: int
    difficulty_range: tuple = (3, 7)
    adaptive: bool = True
    time_limit_minutes: Optional[int] = None
    randomize: bool = True
    allow_hints: bool = True
    allow_skip: bool = True
    immediate_feedback: bool = False

class AssessmentEngine:
    """Comprehensive assessment system with adaptive capabilities"""
    
    def __init__(self, db_session, ai_service):
        self.db = db_session
        self.ai = ai_service
        self.question_bank = QuestionBank(db_session)
        self.grading_service = GradingService(ai_service)
        
    async def create_assessment(
        self, 
        skills: List[str], 
        config: AssessmentConfig,
        learner_profile: Optional[LearnerProfile] = None
    ) -> Dict:
        """Create a personalized assessment"""
        
        # Select questions based on skills and config
        if config.adaptive and learner_profile:
            questions = await self._select_adaptive_questions(
                skills, 
                learner_profile, 
                config
            )
        else:
            questions = await self._select_standard_questions(
                skills, 
                config
            )
            
        # Randomize if requested
        if config.randomize:
            random.shuffle(questions)
            
        # Create assessment structure
        assessment = {
            "id": self._generate_assessment_id(),
            "questions": questions,
            "config": config,
            "created_at": datetime.utcnow(),
            "skills": skills,
            "estimated_duration": self._estimate_duration(questions),
            "total_points": sum(q.points for q in questions)
        }
        
        # Store assessment
        await self.db.assessments.insert_one(assessment)
        
        return assessment
        
    async def submit_answer(
        self, 
        assessment_id: str, 
        question_id: str,
        answer: Union[str, List[str], Dict],
        user_id: str
    ) -> Dict:
        """Submit and grade an answer"""
        
        # Retrieve question
        assessment = await self.db.assessments.find_one(
            {"id": assessment_id}
        )
        question = next(
            q for q in assessment["questions"] 
            if q.id == question_id
        )
        
        # Grade answer based on question type
        if question.type in [
            QuestionType.MULTIPLE_CHOICE, 
            QuestionType.TRUE_FALSE
        ]:
            result = self._grade_objective_question(question, answer)
        elif question.type == QuestionType.CODING:
            result = await self._grade_coding_question(question, answer)
        elif question.type in [QuestionType.SHORT_ANSWER, QuestionType.ESSAY]:
            result = await self._grade_text_question(question, answer)
        else:
            result = self._grade_interactive_question(question, answer)
            
        # Store result
        submission = {
            "assessment_id": assessment_id,
            "question_id": question_id,
            "user_id": user_id,
            "answer": answer,
            "result": result,
            "submitted_at": datetime.utcnow()
        }
        
        await self.db.submissions.insert_one(submission)
        
        # Update adaptive difficulty if enabled
        if assessment["config"].adaptive:
            await self._update_adaptive_difficulty(
                assessment_id, 
                question_id, 
                result["score"]
            )
            
        return result
        
    def _grade_objective_question(
        self, 
        question: Question, 
        answer: Union[str, List[str]]
    ) -> Dict:
        """Grade multiple choice or true/false questions"""
        
        is_correct = answer == question.correct_answer
        
        return {
            "score": question.points if is_correct else 0,
            "max_score": question.points,
            "is_correct": is_correct,
            "feedback": question.explanation if not is_correct else None
        }
        
    async def _grade_coding_question(
        self, 
        question: Question, 
        code: str
    ) -> Dict:
        """Grade coding questions with test cases"""
        
        # Run test cases
        test_results = await self._run_code_tests(
            code, 
            question.correct_answer["test_cases"]
        )
        
        # Calculate score based on passing tests
        passed_tests = sum(1 for r in test_results if r["passed"])
        total_tests = len(test_results)
        score_percentage = passed_tests / total_tests
        
        # Check code quality
        quality_score = await self._analyze_code_quality(code)
        
        # Combined score (70% correctness, 30% quality)
        final_score = (
            score_percentage * 0.7 + 
            quality_score * 0.3
        ) * question.points
        
        return {
            "score": final_score,
            "max_score": question.points,
            "is_correct": score_percentage == 1.0,
            "test_results": test_results,
            "quality_analysis": quality_score,
            "feedback": self._generate_coding_feedback(
                test_results, 
                quality_score
            )
        }
        
    async def _grade_text_question(
        self, 
        question: Question, 
        answer: str
    ) -> Dict:
        """Grade text-based questions using AI"""
        
        # Use AI to evaluate answer
        grading_prompt = f"""
        Question: {question.content}
        Student Answer: {answer}
        Correct Answer Guidelines: {question.correct_answer}
        
        Grade this answer on:
        1. Accuracy (40%)
        2. Completeness (30%) 
        3. Clarity (20%)
        4. Understanding (10%)
        
        Provide a score from 0 to {question.points} and detailed feedback.
        """
        
        ai_evaluation = await self.ai.evaluate_answer(grading_prompt)
        
        return {
            "score": ai_evaluation["score"],
            "max_score": question.points,
            "is_correct": ai_evaluation["score"] >= question.points * 0.7,
            "feedback": ai_evaluation["feedback"],
            "rubric_scores": ai_evaluation["rubric_scores"]
        }
        
    async def _select_adaptive_questions(
        self, 
        skills: List[str],
        profile: LearnerProfile,
        config: AssessmentConfig
    ) -> List[Question]:
        """Select questions adaptively based on learner profile"""
        
        selected_questions = []
        current_difficulty = self._estimate_starting_difficulty(profile)
        
        for i in range(config.question_count):
            # Get candidate questions
            candidates = await self.question_bank.get_questions(
                skills=skills,
                difficulty_range=(
                    max(1, current_difficulty - 1),
                    min(10, current_difficulty + 1)
                ),
                exclude_ids=[q.id for q in selected_questions]
            )
            
            if not candidates:
                break
                
            # Select best question based on information gain
            best_question = self._select_best_question(
                candidates, 
                profile, 
                selected_questions
            )
            
            selected_questions.append(best_question)
            
            # Simulate difficulty adjustment
            # (In real assessment, this happens after each answer)
            current_difficulty = self._adjust_difficulty(
                current_difficulty,
                profile.performance_history
            )
            
        return selected_questions
```

### 3. Rubrics System

```python
# backend/learning/rubrics.py
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from enum import Enum

class RubricType(Enum):
    HOLISTIC = "holistic"
    ANALYTIC = "analytic"
    SINGLE_POINT = "single_point"
    CHECKLIST = "checklist"

@dataclass
class Criterion:
    id: str
    name: str
    description: str
    weight: float = 1.0
    levels: List[Dict] = field(default_factory=list)
    # Each level: {"score": int, "description": str, "indicators": List[str]}

@dataclass
class Rubric:
    id: str
    name: str
    type: RubricType
    description: str
    criteria: List[Criterion]
    total_points: float
    metadata: Dict = field(default_factory=dict)
    created_by: str = None
    created_at: datetime = None
    
    def calculate_max_score(self) -> float:
        """Calculate maximum possible score"""
        if self.type == RubricType.ANALYTIC:
            return sum(
                c.weight * max(l["score"] for l in c.levels)
                for c in self.criteria
            )
        return self.total_points

class RubricsSystem:
    """Comprehensive rubrics management system"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.validators = RubricValidators()
        
    async def create_rubric(
        self, 
        rubric_data: Dict, 
        user_id: str
    ) -> Rubric:
        """Create a new rubric"""
        
        # Validate rubric structure
        validation_result = self.validators.validate_rubric(rubric_data)
        if not validation_result.is_valid:
            raise ValueError(f"Invalid rubric: {validation_result.errors}")
            
        # Create rubric object
        rubric = Rubric(
            id=self._generate_rubric_id(),
            name=rubric_data["name"],
            type=RubricType(rubric_data["type"]),
            description=rubric_data["description"],
            criteria=[
                self._create_criterion(c) 
                for c in rubric_data["criteria"]
            ],
            total_points=rubric_data.get(
                "total_points", 
                self._calculate_total_points(rubric_data)
            ),
            metadata=rubric_data.get("metadata", {}),
            created_by=user_id,
            created_at=datetime.utcnow()
        )
        
        # Store rubric
        await self.db.rubrics.insert_one(rubric.dict())
        
        # Index for search
        await self._index_rubric(rubric)
        
        return rubric
        
    async def apply_rubric(
        self, 
        rubric_id: str, 
        submission: Dict,
        evaluator_id: str
    ) -> Dict:
        """Apply rubric to evaluate a submission"""
        
        # Retrieve rubric
        rubric = await self.get_rubric(rubric_id)
        
        # Initialize evaluation
        evaluation = {
            "rubric_id": rubric_id,
            "submission_id": submission["id"],
            "evaluator_id": evaluator_id,
            "scores": {},
            "feedback": {},
            "total_score": 0,
            "evaluated_at": datetime.utcnow()
        }
        
        # Evaluate based on rubric type
        if rubric.type == RubricType.ANALYTIC:
            evaluation = await self._evaluate_analytic(
                rubric, 
                submission, 
                evaluation
            )
        elif rubric.type == RubricType.HOLISTIC:
            evaluation = await self._evaluate_holistic(
                rubric, 
                submission, 
                evaluation
            )
        elif rubric.type == RubricType.CHECKLIST:
            evaluation = await self._evaluate_checklist(
                rubric, 
                submission, 
                evaluation
            )
            
        # Store evaluation
        await self.db.evaluations.insert_one(evaluation)
        
        return evaluation
        
    async def _evaluate_analytic(
        self, 
        rubric: Rubric, 
        submission: Dict,
        evaluation: Dict
    ) -> Dict:
        """Evaluate using analytic rubric"""
        
        total_score = 0
        
        for criterion in rubric.criteria:
            # Evaluate against each criterion
            criterion_score = await self._evaluate_criterion(
                criterion, 
                submission
            )
            
            evaluation["scores"][criterion.id] = {
                "score": criterion_score["score"],
                "level": criterion_score["level"],
                "feedback": criterion_score["feedback"]
            }
            
            # Add to total with weight
            total_score += criterion_score["score"] * criterion.weight
            
        evaluation["total_score"] = total_score
        evaluation["percentage"] = (
            total_score / rubric.calculate_max_score() * 100
        )
        
        return evaluation
        
    async def _evaluate_criterion(
        self, 
        criterion: Criterion, 
        submission: Dict
    ) -> Dict:
        """Evaluate submission against a single criterion"""
        
        # For AI-assisted evaluation
        if submission.get("type") == "text":
            return await self._ai_evaluate_text_criterion(
                criterion, 
                submission["content"]
            )
        elif submission.get("type") == "code":
            return await self._evaluate_code_criterion(
                criterion, 
                submission["content"]
            )
        else:
            # Manual evaluation placeholder
            return {
                "score": 0,
                "level": "Not Evaluated",
                "feedback": "Manual evaluation required"
            }
            
    async def _ai_evaluate_text_criterion(
        self, 
        criterion: Criterion, 
        text: str
    ) -> Dict:
        """Use AI to evaluate text against criterion"""
        
        # Build evaluation prompt
        levels_description = "\n".join([
            f"Level {level['score']}: {level['description']}"
            for level in criterion.levels
        ])
        
        prompt = f"""
        Evaluate the following text against this criterion:
        
        Criterion: {criterion.name}
        Description: {criterion.description}
        
        Scoring Levels:
        {levels_description}
        
        Text to evaluate:
        {text}
        
        Provide the score level and specific feedback.
        """
        
        # Get AI evaluation
        ai_response = await self.ai.evaluate(prompt)
        
        return {
            "score": ai_response["score"],
            "level": ai_response["level_description"],
            "feedback": ai_response["feedback"]
        }
        
    def build_visual_rubric(self, rubric: Rubric) -> Dict:
        """Build visual representation of rubric"""
        
        visual_data = {
            "type": "rubric_grid",
            "title": rubric.name,
            "headers": ["Criteria"] + [
                f"Level {i+1}" 
                for i in range(len(rubric.criteria[0].levels))
            ],
            "rows": []
        }
        
        for criterion in rubric.criteria:
            row = {
                "criterion": {
                    "name": criterion.name,
                    "description": criterion.description,
                    "weight": criterion.weight
                },
                "levels": []
            }
            
            for level in criterion.levels:
                row["levels"].append({
                    "score": level["score"],
                    "description": level["description"],
                    "indicators": level.get("indicators", [])
                })
                
            visual_data["rows"].append(row)
            
        return visual_data
```

### 4. Progress Tracking System

```python
# backend/learning/progress_tracker.py
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import numpy as np

@dataclass
class ProgressMetrics:
    user_id: str
    overall_progress: float  # 0-100
    skill_levels: Dict[str, float]  # skill -> proficiency (0-1)
    completed_items: List[str]
    time_spent_minutes: int
    streak_days: int
    achievements: List[str]
    last_activity: datetime
    
@dataclass
class LearningActivity:
    user_id: str
    activity_type: str  # lesson, assessment, project
    activity_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[float] = None
    time_spent_minutes: int = 0
    skills_practiced: List[str] = field(default_factory=list)
    
class ProgressTracker:
    """Comprehensive progress tracking system"""
    
    def __init__(self, db_session, analytics_engine):
        self.db = db_session
        self.analytics = analytics_engine
        
    async def track_activity(
        self, 
        activity: LearningActivity
    ) -> None:
        """Track a learning activity"""
        
        # Store activity
        await self.db.activities.insert_one(activity.dict())
        
        # Update real-time metrics
        await self._update_metrics(activity)
        
        # Check for achievements
        new_achievements = await self._check_achievements(
            activity.user_id
        )
        
        # Send notifications for achievements
        if new_achievements:
            await self._notify_achievements(
                activity.user_id, 
                new_achievements
            )
            
    async def get_progress(
        self, 
        user_id: str,
        time_range: Optional[timedelta] = None
    ) -> ProgressMetrics:
        """Get comprehensive progress metrics"""
        
        # Retrieve activities
        query = {"user_id": user_id}
        if time_range:
            start_date = datetime.utcnow() - time_range
            query["started_at"] = {"$gte": start_date}
            
        activities = await self.db.activities.find(query).to_list()
        
        # Calculate metrics
        metrics = ProgressMetrics(
            user_id=user_id,
            overall_progress=self._calculate_overall_progress(activities),
            skill_levels=self._calculate_skill_levels(activities),
            completed_items=[
                a["activity_id"] for a in activities 
                if a.get("completed_at")
            ],
            time_spent_minutes=sum(
                a.get("time_spent_minutes", 0) for a in activities
            ),
            streak_days=await self._calculate_streak(user_id),
            achievements=await self._get_achievements(user_id),
            last_activity=max(
                (a["started_at"] for a in activities), 
                default=None
            )
        )
        
        return metrics
        
    async def generate_progress_report(
        self, 
        user_id: str,
        period: str = "weekly"
    ) -> Dict:
        """Generate detailed progress report"""
        
        # Determine time range
        time_ranges = {
            "daily": timedelta(days=1),
            "weekly": timedelta(weeks=1),
            "monthly": timedelta(days=30),
            "quarterly": timedelta(days=90)
        }
        time_range = time_ranges.get(period, timedelta(weeks=1))
        
        # Get current and previous period metrics
        current_metrics = await self.get_progress(user_id, time_range)
        previous_metrics = await self.get_progress(
            user_id, 
            time_range * 2
        )
        
        # Calculate improvements
        improvements = self._calculate_improvements(
            current_metrics, 
            previous_metrics
        )
        
        # Generate insights
        insights = await self._generate_insights(
            user_id, 
            current_metrics, 
            improvements
        )
        
        # Create report
        report = {
            "user_id": user_id,
            "period": period,
            "generated_at": datetime.utcnow(),
            "summary": {
                "overall_progress": current_metrics.overall_progress,
                "time_spent": f"{current_metrics.time_spent_minutes // 60}h {current_metrics.time_spent_minutes % 60}m",
                "items_completed": len(current_metrics.completed_items),
                "streak": current_metrics.streak_days,
                "new_achievements": len([
                    a for a in current_metrics.achievements
                    if a not in previous_metrics.achievements
                ])
            },
            "skill_progress": self._format_skill_progress(
                current_metrics.skill_levels,
                improvements.get("skill_improvements", {})
            ),
            "learning_patterns": await self._analyze_learning_patterns(
                user_id, 
                time_range
            ),
            "recommendations": await self._generate_recommendations(
                user_id, 
                current_metrics
            ),
            "insights": insights,
            "visualizations": self._generate_visualizations(
                current_metrics
            )
        }
        
        return report
        
    def _calculate_skill_levels(
        self, 
        activities: List[Dict]
    ) -> Dict[str, float]:
        """Calculate proficiency levels for each skill"""
        
        skill_scores = {}
        skill_attempts = {}
        
        for activity in activities:
            if not activity.get("completed_at") or not activity.get("score"):
                continue
                
            for skill in activity.get("skills_practiced", []):
                if skill not in skill_scores:
                    skill_scores[skill] = []
                    
                # Weight recent activities more heavily
                days_ago = (
                    datetime.utcnow() - activity["completed_at"]
                ).days
                weight = 1.0 / (1.0 + days_ago * 0.1)
                
                skill_scores[skill].append(
                    activity["score"] * weight
                )
                
        # Calculate weighted average for each skill
        skill_levels = {}
        for skill, scores in skill_scores.items():
            if scores:
                skill_levels[skill] = np.average(scores)
                
        return skill_levels
        
    async def _analyze_learning_patterns(
        self, 
        user_id: str,
        time_range: timedelta
    ) -> Dict:
        """Analyze learning patterns and habits"""
        
        activities = await self.db.activities.find({
            "user_id": user_id,
            "started_at": {"$gte": datetime.utcnow() - time_range}
        }).to_list()
        
        # Time of day analysis
        hour_distribution = {}
        for activity in activities:
            hour = activity["started_at"].hour
            hour_distribution[hour] = hour_distribution.get(hour, 0) + 1
            
        # Day of week analysis
        day_distribution = {}
        for activity in activities:
            day = activity["started_at"].strftime("%A")
            day_distribution[day] = day_distribution.get(day, 0) + 1
            
        # Session duration analysis
        durations = [
            a.get("time_spent_minutes", 0) 
            for a in activities 
            if a.get("time_spent_minutes")
        ]
        
        patterns = {
            "most_active_hours": sorted(
                hour_distribution.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:3],
            "most_active_days": sorted(
                day_distribution.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:3],
            "average_session_duration": (
                np.mean(durations) if durations else 0
            ),
            "consistency_score": self._calculate_consistency_score(
                activities
            )
        }
        
        return patterns
        
    def _generate_visualizations(
        self, 
        metrics: ProgressMetrics
    ) -> Dict:
        """Generate data for progress visualizations"""
        
        return {
            "skill_radar": {
                "type": "radar",
                "data": {
                    "labels": list(metrics.skill_levels.keys()),
                    "values": list(metrics.skill_levels.values())
                }
            },
            "progress_timeline": {
                "type": "line",
                "data": self._generate_timeline_data(metrics)
            },
            "achievement_badges": {
                "type": "badges",
                "data": [
                    self._get_achievement_details(a) 
                    for a in metrics.achievements
                ]
            },
            "time_distribution": {
                "type": "pie",
                "data": self._calculate_time_distribution(metrics)
            }
        }
```

## API Specifications

### Learning Path Endpoints

#### POST /api/learning/paths/generate
Generate personalized learning path
```json
{
  "target_skills": ["python_basics", "data_structures"],
  "duration_weeks": 12,
  "weekly_hours": 10
}
```

#### GET /api/learning/paths/{path_id}
Get learning path details

#### POST /api/learning/paths/{path_id}/adapt
Adapt path based on performance
```json
{
  "recent_performance": {
    "average_score": 0.85,
    "completed_nodes": ["node1", "node2"],
    "struggling_areas": ["recursion"]
  }
}
```

### Assessment Endpoints

#### POST /api/assessments/create
Create new assessment
```json
{
  "skills": ["python_loops", "conditionals"],
  "config": {
    "question_count": 20,
    "adaptive": true,
    "time_limit_minutes": 45
  }
}
```

#### POST /api/assessments/{id}/submit
Submit answer
```json
{
  "question_id": "q123",
  "answer": "option_a"
}
```

#### GET /api/assessments/{id}/results
Get assessment results

### Rubrics Endpoints

#### POST /api/rubrics/create
Create new rubric
```json
{
  "name": "Essay Writing Rubric",
  "type": "analytic",
  "criteria": [
    {
      "name": "Content",
      "weight": 0.4,
      "levels": [
        {"score": 4, "description": "Excellent"},
        {"score": 3, "description": "Good"},
        {"score": 2, "description": "Satisfactory"},
        {"score": 1, "description": "Needs Improvement"}
      ]
    }
  ]
}
```

#### POST /api/rubrics/{id}/apply
Apply rubric to submission

### Progress Endpoints

#### GET /api/progress/summary
Get progress summary

#### GET /api/progress/report
Generate progress report
```json
{
  "period": "weekly",
  "include_visualizations": true
}
```

#### GET /api/progress/achievements
Get user achievements

## Database Schema

```sql
-- Learning paths
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    target_skills JSONB,
    nodes JSONB,
    config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learning activities
CREATE TABLE learning_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50),
    activity_id VARCHAR(255),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    score DECIMAL(5,2),
    time_spent_minutes INTEGER,
    skills_practiced JSONB,
    metadata JSONB
);

-- Assessments
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    skills JSONB,
    questions JSONB,
    config JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessment submissions
CREATE TABLE assessment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessments(id),
    user_id UUID REFERENCES users(id),
    answers JSONB,
    scores JSONB,
    total_score DECIMAL(5,2),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rubrics
CREATE TABLE rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    type VARCHAR(50),
    description TEXT,
    criteria JSONB,
    total_points DECIMAL(5,2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress metrics
CREATE TABLE progress_metrics (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    overall_progress DECIMAL(5,2),
    skill_levels JSONB,
    achievements JSONB,
    streak_days INTEGER,
    total_time_minutes INTEGER,
    last_activity TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Performance Optimization

### Caching Strategy
```python
# Redis cache keys
cache_keys = {
    # Learning path cache (TTL: 1 hour)
    "learning_path": "learning:path:{user_id}:{path_id}",
    
    # Progress metrics cache (TTL: 15 minutes)
    "progress": "learning:progress:{user_id}",
    
    # Question bank cache (TTL: 1 day)
    "questions": "learning:questions:{skill}:{difficulty}",
    
    # Rubric cache (TTL: 7 days)
    "rubric": "learning:rubric:{rubric_id}"
}
```

### Query Optimization
- Index on user_id, activity_type, and started_at for activities
- Materialized views for progress summaries
- Batch processing for activity tracking
- Async processing for report generation

## Security Considerations

### Assessment Security
- Randomize question order
- Time-based question locking
- Prevent answer pattern detection
- Browser lockdown for high-stakes assessments
- IP-based session validation

### Data Privacy
- Anonymize learning data for analytics
- Encrypt sensitive assessment content
- Role-based access to rubrics
- Audit trail for all evaluations

## Monitoring & Analytics

### Key Metrics
- Average time to complete assessments
- Learning path completion rates
- Skill improvement rates
- Assessment difficulty calibration
- User engagement patterns

### Alerts
- Low completion rates
- Unusual assessment patterns
- System performance degradation
- High failure rates on specific topics

## Future Enhancements

### Phase 2-alt: PBL 系統（✓ 已完成）
- ✓ PBL 系統框架建設
- ✓ AI 輔助求職情境 MVP
- ✓ 過程記錄系統 (GCS JSON)
- ✓ KSA-Rubrics 對應機制

### Phase 2: 學習系統優化 (2025/07-09)
- [ ] GCS 到 Redis 快取遷移
- [ ] Rubrics 專家協作流程 (GitHub PR)
- [ ] 評估系統整合 Rubrics
- [ ] PBL 效能優化

### Phase 3: 知識圖譜系統 (2025/10-12)
- [ ] 學習路徑生成器
- [ ] 知識圖譜視覺化 (D3.js)
- [ ] 自適應學習建議
- [ ] PostgreSQL 整合 (DAU > 100)
- [ ] Neo4j 知識圖譜 (Phase 4 準備)

### Phase 4: 進階功能 (2026+)
- [ ] AI 個人化推薦 (MCP Agent)
- [ ] 協作學習功能
- [ ] 遊戲化元素
- [ ] 企業級學習管理
- [ ] 區塊鏈證書