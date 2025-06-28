# Analytics & Reporting Technical Specification

## Overview

This document outlines the technical architecture for AI Square's analytics and reporting system, following the phased approach defined in the PRD. The system evolves from basic client-side analytics (Phase 1) to comprehensive learning analytics with predictive capabilities (Phase 4+).

## Architecture Design

### 漸進式分析架構演進

#### Phase 1-2: Basic Analytics (現況)
```
┌────────────────────────────────────────────────────────┐
│                 Frontend Only                           │
├────────────────────────────────────────────────────────┤
│  Google Analytics  │  Local Storage  │  Console Logs   │
│  (基礎追蹤)        │  (進度儲存)     │  (除錯用)       │
└────────────────────────────────────────────────────────┘
```

#### Phase 3: Production Analytics
```
┌────────────────────────────────────────────────────────┐
│              Analytics Platform                         │
├────────────────────────────────────────────────────────┤
│              Data Collection Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Event     │  │  Learning   │  │    Usage    │   │
│  │  Tracking   │  │  Progress   │  │   Metrics   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├────────────────────────────────────────────────────────┤
│               Storage Layer                             │
│  ┌─────────────┐  ┌─────────────┐                     │
│  │ PostgreSQL  │  │    Redis    │                     │
│  │  (Events)   │  │   (Cache)   │                     │
│  └─────────────┘  └─────────────┘                     │
└────────────────────────────────────────────────────────┘
```

#### Phase 4+: Advanced Analytics
```
┌────────────────────────────────────────────────────────┐
│              Analytics Platform                         │
├────────────────────────────────────────────────────────┤
│              Data Collection Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Event     │  │    User     │  │   System    │   │
│  │  Tracking   │  │  Activity   │  │   Metrics   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├────────────────────────────────────────────────────────┤
│              Data Processing Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Stream    │  │    Batch    │  │   Real-time │   │
│  │ Processing  │  │ Processing  │  │  Analytics  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├────────────────────────────────────────────────────────┤
│              Analytics Engine Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Learning   │  │ Performance │  │ Predictive  │   │
│  │  Analytics  │  │   Metrics   │  │   Models    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└────────────────────────────────────────────────────────┘
```

## Technical Requirements

### Core Components

1. **Event Tracking System**
   - Client-side event capture
   - Server-side event processing
   - Event schema validation
   - Real-time event streaming

2. **Analytics Engine**
   - Learning analytics algorithms
   - Performance metric calculations
   - Predictive modeling
   - Anomaly detection

3. **Dashboard System**
   - Real-time data visualization
   - Customizable widgets
   - Interactive reports
   - Export capabilities

4. **Reporting Engine**
   - Scheduled report generation
   - Custom report builder
   - Multi-format export
   - Distribution automation

## Implementation Details

### 1. Event Tracking System

#### Phase 1-2 實作 (現況)
```typescript
// frontend/lib/analytics/simple-tracker.ts
class SimpleAnalyticsTracker {
  constructor() {
    // 使用 Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      this.gtag = window.gtag
    }
  }
  
  track(eventName: string, properties?: Record<string, any>) {
    // Google Analytics
    if (this.gtag) {
      this.gtag('event', eventName, properties)
    }
    
    // Local Storage for progress
    if (eventName.includes('progress')) {
      this.saveProgress(properties)
    }
  }
  
  private saveProgress(data: any) {
    const progress = JSON.parse(
      localStorage.getItem('learning_progress') || '{}'
    )
    progress[data.lessonId] = data
    localStorage.setItem('learning_progress', JSON.stringify(progress))
  }
}
```

#### Phase 3+ 實作
```typescript
// frontend/lib/analytics/tracker.ts
interface AnalyticsEvent {
  eventType: string
  eventCategory: string
  eventAction: string
  eventLabel?: string
  eventValue?: number
  userId?: string
  sessionId: string
  timestamp: Date
  properties?: Record<string, any>
  context?: {
    page?: string
    referrer?: string
    userAgent?: string
    viewport?: { width: number; height: number }
    screen?: { width: number; height: number }
  }
}

class AnalyticsTracker {
  private queue: AnalyticsEvent[] = []
  private batchSize = 50
  private flushInterval = 5000 // 5 seconds
  private sessionId: string
  
  constructor(private apiEndpoint: string) {
    this.sessionId = this.generateSessionId()
    this.startBatchProcessor()
    this.attachGlobalListeners()
  }
  
  track(event: Partial<AnalyticsEvent>) {
    const fullEvent: AnalyticsEvent = {
      ...event,
      sessionId: this.sessionId,
      timestamp: new Date(),
      context: this.captureContext(),
      userId: this.getCurrentUserId()
    } as AnalyticsEvent
    
    this.queue.push(fullEvent)
    
    if (this.queue.length >= this.batchSize) {
      this.flush()
    }
  }
  
  // Specific tracking methods
  trackPageView(page: string, properties?: Record<string, any>) {
    this.track({
      eventType: 'page_view',
      eventCategory: 'navigation',
      eventAction: 'view',
      eventLabel: page,
      properties
    })
  }
  
  trackLearningActivity(activity: {
    type: string
    contentId: string
    duration?: number
    score?: number
    completed?: boolean
  }) {
    this.track({
      eventType: 'learning_activity',
      eventCategory: 'learning',
      eventAction: activity.type,
      eventLabel: activity.contentId,
      eventValue: activity.score,
      properties: {
        duration: activity.duration,
        completed: activity.completed
      }
    })
  }
  
  trackAssessment(assessment: {
    assessmentId: string
    score: number
    timeSpent: number
    questions: Array<{
      questionId: string
      correct: boolean
      timeSpent: number
    }>
  }) {
    this.track({
      eventType: 'assessment_completed',
      eventCategory: 'assessment',
      eventAction: 'complete',
      eventLabel: assessment.assessmentId,
      eventValue: assessment.score,
      properties: {
        timeSpent: assessment.timeSpent,
        questionDetails: assessment.questions
      }
    })
  }
  
  trackError(error: {
    message: string
    stack?: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }) {
    this.track({
      eventType: 'error',
      eventCategory: 'system',
      eventAction: 'error',
      eventLabel: error.message,
      properties: {
        stack: error.stack,
        severity: error.severity
      }
    })
  }
  
  private async flush() {
    if (this.queue.length === 0) return
    
    const events = [...this.queue]
    this.queue = []
    
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      })
    } catch (error) {
      // Re-queue events on failure
      this.queue.unshift(...events)
      console.error('Failed to send analytics events:', error)
    }
  }
  
  private captureContext() {
    return {
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height
      }
    }
  }
}

// Performance monitoring
class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric> = new Map()
  
  startTimer(metricName: string) {
    this.metrics.set(metricName, {
      startTime: performance.now(),
      name: metricName
    })
  }
  
  endTimer(metricName: string, metadata?: Record<string, any>) {
    const metric = this.metrics.get(metricName)
    if (!metric) return
    
    const duration = performance.now() - metric.startTime
    
    analyticsTracker.track({
      eventType: 'performance',
      eventCategory: 'system',
      eventAction: 'timing',
      eventLabel: metricName,
      eventValue: duration,
      properties: metadata
    })
    
    this.metrics.delete(metricName)
  }
  
  measureWebVitals() {
    // Measure Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        
        analyticsTracker.track({
          eventType: 'web_vitals',
          eventCategory: 'performance',
          eventAction: 'lcp',
          eventValue: lastEntry.startTime,
          properties: { element: lastEntry.element }
        })
      }).observe({ entryTypes: ['largest-contentful-paint'] })
      
      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          analyticsTracker.track({
            eventType: 'web_vitals',
            eventCategory: 'performance',
            eventAction: 'fid',
            eventValue: entry.processingStart - entry.startTime
          })
        })
      }).observe({ entryTypes: ['first-input'] })
    }
  }
}
```

### 2. Analytics Engine

```python
# backend/analytics/engine.py
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

class LearningAnalyticsEngine:
    """Advanced learning analytics processing engine"""
    
    def __init__(self, db_session, cache_service):
        self.db = db_session
        self.cache = cache_service
        self.ml_models = self._load_ml_models()
        
    async def analyze_learning_patterns(
        self,
        user_id: str,
        time_range: timedelta = timedelta(days=30)
    ) -> Dict[str, Any]:
        """Analyze user learning patterns"""
        
        # Fetch learning activities
        activities = await self._fetch_learning_activities(
            user_id, 
            time_range
        )
        
        if not activities:
            return self._empty_analysis()
            
        # Convert to DataFrame for analysis
        df = pd.DataFrame(activities)
        
        # Perform analyses
        analyses = {
            "engagement_metrics": self._analyze_engagement(df),
            "learning_velocity": self._calculate_learning_velocity(df),
            "skill_progression": await self._analyze_skill_progression(
                user_id, 
                df
            ),
            "optimal_learning_times": self._find_optimal_times(df),
            "content_preferences": self._analyze_content_preferences(df),
            "struggle_points": self._identify_struggle_points(df),
            "recommendations": await self._generate_recommendations(
                user_id, 
                df
            )
        }
        
        return analyses
        
    def _analyze_engagement(self, df: pd.DataFrame) -> Dict:
        """Analyze user engagement metrics"""
        
        # Daily engagement
        df['date'] = pd.to_datetime(df['timestamp']).dt.date
        daily_engagement = df.groupby('date').agg({
            'activity_id': 'count',
            'duration_minutes': 'sum',
            'score': 'mean'
        }).rename(columns={
            'activity_id': 'activities_count',
            'duration_minutes': 'total_minutes'
        })
        
        # Engagement trends
        engagement_trend = np.polyfit(
            range(len(daily_engagement)),
            daily_engagement['total_minutes'].values,
            1
        )[0]
        
        # Session analysis
        sessions = self._identify_sessions(df)
        avg_session_duration = sessions['duration'].mean()
        
        return {
            "daily_average_minutes": daily_engagement['total_minutes'].mean(),
            "engagement_trend": "increasing" if engagement_trend > 0 else "decreasing",
            "trend_strength": abs(engagement_trend),
            "average_session_duration": avg_session_duration,
            "total_activities": len(df),
            "completion_rate": (df['completed'] == True).mean() * 100,
            "consistency_score": self._calculate_consistency_score(
                daily_engagement
            )
        }
        
    def _calculate_learning_velocity(self, df: pd.DataFrame) -> Dict:
        """Calculate how fast the user is progressing"""
        
        # Group by skill and calculate improvement rate
        skill_groups = df.groupby('skill')
        
        velocities = {}
        for skill, group in skill_groups:
            if len(group) < 3:  # Need at least 3 data points
                continue
                
            # Sort by timestamp
            group = group.sort_values('timestamp')
            
            # Calculate score improvement over time
            x = (group['timestamp'] - group['timestamp'].min()).dt.days.values
            y = group['score'].values
            
            if len(x) > 1 and x.std() > 0:
                # Fit linear regression
                slope = np.polyfit(x, y, 1)[0]
                velocities[skill] = {
                    "improvement_rate": slope,  # Points per day
                    "current_level": y[-1],
                    "days_practiced": len(np.unique(x))
                }
                
        return {
            "skill_velocities": velocities,
            "average_velocity": np.mean([
                v["improvement_rate"] for v in velocities.values()
            ]) if velocities else 0,
            "fastest_improving_skill": max(
                velocities.items(), 
                key=lambda x: x[1]["improvement_rate"]
            )[0] if velocities else None
        }
        
    async def _analyze_skill_progression(
        self, 
        user_id: str, 
        df: pd.DataFrame
    ) -> Dict:
        """Analyze skill progression patterns"""
        
        # Get current skill levels
        current_skills = await self.db.user_skills.find_one(
            {"user_id": user_id}
        )
        
        if not current_skills:
            return {}
            
        # Calculate progression for each skill
        progressions = {}
        
        for skill, level in current_skills.get("skills", {}).items():
            skill_activities = df[df['skill'] == skill]
            
            if len(skill_activities) < 2:
                continue
                
            # Calculate progression metrics
            first_score = skill_activities.iloc[0]['score']
            last_score = skill_activities.iloc[-1]['score']
            improvement = last_score - first_score
            
            # Time to proficiency estimation
            if improvement > 0:
                current_rate = improvement / len(skill_activities)
                estimated_sessions_to_mastery = max(
                    0, 
                    (1.0 - last_score) / current_rate
                )
            else:
                estimated_sessions_to_mastery = float('inf')
                
            progressions[skill] = {
                "current_level": level,
                "improvement": improvement,
                "total_practice_time": skill_activities['duration_minutes'].sum(),
                "average_score": skill_activities['score'].mean(),
                "estimated_sessions_to_mastery": estimated_sessions_to_mastery,
                "mastery_percentage": level * 100
            }
            
        return progressions
        
    def _identify_struggle_points(self, df: pd.DataFrame) -> List[Dict]:
        """Identify areas where user is struggling"""
        
        struggle_points = []
        
        # Low performance areas
        low_performance = df[df['score'] < 0.6].groupby('topic').agg({
            'score': ['mean', 'count'],
            'duration_minutes': 'mean'
        })
        
        for topic, stats in low_performance.iterrows():
            if stats[('score', 'count')] >= 3:  # At least 3 attempts
                struggle_points.append({
                    "topic": topic,
                    "average_score": stats[('score', 'mean')],
                    "attempts": stats[('score', 'count')],
                    "average_time_spent": stats[('duration_minutes', 'mean')],
                    "severity": "high" if stats[('score', 'mean')] < 0.4 else "medium"
                })
                
        # Repeated failures
        consecutive_failures = self._find_consecutive_failures(df)
        for failure_pattern in consecutive_failures:
            struggle_points.append({
                "topic": failure_pattern["topic"],
                "pattern": "consecutive_failures",
                "count": failure_pattern["count"],
                "severity": "critical" if failure_pattern["count"] > 3 else "high"
            })
            
        return struggle_points
        
    async def generate_performance_report(
        self,
        user_id: str,
        report_type: str = "weekly"
    ) -> Dict:
        """Generate comprehensive performance report"""
        
        # Determine time range
        time_ranges = {
            "daily": timedelta(days=1),
            "weekly": timedelta(weeks=1),
            "monthly": timedelta(days=30),
            "quarterly": timedelta(days=90)
        }
        time_range = time_ranges.get(report_type, timedelta(weeks=1))
        
        # Gather data
        current_data = await self._gather_performance_data(
            user_id, 
            time_range
        )
        previous_data = await self._gather_performance_data(
            user_id, 
            time_range * 2,
            time_range
        )
        
        # Calculate metrics
        metrics = self._calculate_performance_metrics(
            current_data, 
            previous_data
        )
        
        # Generate insights
        insights = await self._generate_performance_insights(
            metrics, 
            current_data
        )
        
        # Create visualizations data
        visualizations = self._prepare_visualization_data(
            current_data, 
            metrics
        )
        
        # Build report
        report = {
            "report_id": self._generate_report_id(),
            "user_id": user_id,
            "report_type": report_type,
            "generated_at": datetime.utcnow(),
            "period": {
                "start": datetime.utcnow() - time_range,
                "end": datetime.utcnow()
            },
            "summary": self._generate_executive_summary(metrics),
            "metrics": metrics,
            "insights": insights,
            "recommendations": await self._generate_recommendations(
                user_id, 
                current_data
            ),
            "visualizations": visualizations,
            "comparative_analysis": self._compare_with_peers(
                metrics, 
                user_id
            )
        }
        
        # Store report
        await self.db.reports.insert_one(report)
        
        return report

class PredictiveAnalytics:
    """Machine learning models for predictive analytics"""
    
    def __init__(self):
        self.models = {
            "dropout_prediction": self._load_dropout_model(),
            "performance_prediction": self._load_performance_model(),
            "engagement_prediction": self._load_engagement_model()
        }
        self.scaler = StandardScaler()
        
    async def predict_dropout_risk(
        self,
        user_id: str,
        activity_data: pd.DataFrame
    ) -> Dict:
        """Predict risk of user dropping out"""
        
        # Extract features
        features = self._extract_dropout_features(activity_data)
        
        # Scale features
        features_scaled = self.scaler.fit_transform([features])
        
        # Make prediction
        dropout_probability = self.models["dropout_prediction"].predict_proba(
            features_scaled
        )[0][1]
        
        # Identify risk factors
        risk_factors = self._identify_risk_factors(
            features, 
            dropout_probability
        )
        
        return {
            "dropout_probability": float(dropout_probability),
            "risk_level": self._categorize_risk(dropout_probability),
            "risk_factors": risk_factors,
            "recommended_interventions": self._recommend_interventions(
                risk_factors
            )
        }
        
    async def predict_performance(
        self,
        user_id: str,
        skill: str,
        future_days: int = 30
    ) -> Dict:
        """Predict future performance"""
        
        # Get historical data
        historical = await self._get_skill_history(user_id, skill)
        
        if len(historical) < 5:
            return {"error": "Insufficient data for prediction"}
            
        # Prepare features
        features = self._prepare_performance_features(historical)
        
        # Make predictions
        predictions = []
        current_features = features[-1]
        
        for day in range(future_days):
            # Predict next value
            pred = self.models["performance_prediction"].predict(
                [current_features]
            )[0]
            
            predictions.append({
                "day": day + 1,
                "predicted_score": float(pred),
                "confidence_interval": self._calculate_confidence_interval(
                    pred, 
                    historical
                )
            })
            
            # Update features for next prediction
            current_features = self._update_features(
                current_features, 
                pred
            )
            
        return {
            "skill": skill,
            "current_level": float(historical[-1]["score"]),
            "predictions": predictions,
            "expected_mastery_date": self._calculate_mastery_date(
                predictions
            ),
            "confidence_score": self._calculate_prediction_confidence(
                historical
            )
        }
```

### 3. Dashboard System

```typescript
// frontend/components/analytics/Dashboard.tsx
import React, { useState, useEffect } from 'react'
import { Line, Bar, Radar, Doughnut } from 'react-chartjs-2'
import { GridLayout } from 'react-grid-layout'

interface DashboardWidget {
  id: string
  type: 'chart' | 'metric' | 'table' | 'heatmap' | 'custom'
  title: string
  dataSource: string
  config: Record<string, any>
  position: { x: number; y: number; w: number; h: number }
}

interface DashboardConfig {
  id: string
  name: string
  widgets: DashboardWidget[]
  refreshInterval: number
  filters: Record<string, any>
}

const AnalyticsDashboard: React.FC<{ 
  dashboardId: string 
}> = ({ dashboardId }) => {
  const [config, setConfig] = useState<DashboardConfig | null>(null)
  const [data, setData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  
  useEffect(() => {
    loadDashboard()
    const interval = setInterval(refreshData, config?.refreshInterval || 30000)
    return () => clearInterval(interval)
  }, [dashboardId])
  
  const loadDashboard = async () => {
    const response = await fetch(`/api/dashboards/${dashboardId}`)
    const dashboardConfig = await response.json()
    setConfig(dashboardConfig)
    await refreshData()
  }
  
  const refreshData = async () => {
    if (!config) return
    
    setLoading(true)
    const dataPromises = config.widgets.map(widget => 
      fetch(`/api/analytics/data/${widget.dataSource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: config.filters,
          config: widget.config
        })
      }).then(res => res.json())
    )
    
    const results = await Promise.all(dataPromises)
    const newData: Record<string, any> = {}
    
    config.widgets.forEach((widget, index) => {
      newData[widget.id] = results[index]
    })
    
    setData(newData)
    setLoading(false)
  }
  
  const renderWidget = (widget: DashboardWidget) => {
    const widgetData = data[widget.id]
    
    if (!widgetData) {
      return <WidgetSkeleton />
    }
    
    switch (widget.type) {
      case 'chart':
        return <ChartWidget widget={widget} data={widgetData} />
      case 'metric':
        return <MetricWidget widget={widget} data={widgetData} />
      case 'table':
        return <TableWidget widget={widget} data={widgetData} />
      case 'heatmap':
        return <HeatmapWidget widget={widget} data={widgetData} />
      case 'custom':
        return <CustomWidget widget={widget} data={widgetData} />
      default:
        return null
    }
  }
  
  const handleLayoutChange = (layout: any[]) => {
    if (!editMode || !config) return
    
    const updatedWidgets = config.widgets.map(widget => {
      const layoutItem = layout.find(l => l.i === widget.id)
      if (layoutItem) {
        return {
          ...widget,
          position: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        }
      }
      return widget
    })
    
    setConfig({ ...config, widgets: updatedWidgets })
  }
  
  return (
    <div className="analytics-dashboard">
      <DashboardHeader 
        config={config}
        onRefresh={refreshData}
        onToggleEdit={() => setEditMode(!editMode)}
        onSave={() => saveDashboard(config)}
      />
      
      <DashboardFilters 
        filters={config?.filters || {}}
        onChange={(filters) => setConfig({ ...config!, filters })}
      />
      
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <GridLayout
          className="dashboard-grid"
          layout={config?.widgets.map(w => ({
            i: w.id,
            ...w.position
          })) || []}
          onLayoutChange={handleLayoutChange}
          isDraggable={editMode}
          isResizable={editMode}
          cols={12}
          rowHeight={100}
        >
          {config?.widgets.map(widget => (
            <div key={widget.id} className="dashboard-widget">
              {renderWidget(widget)}
            </div>
          ))}
        </GridLayout>
      )}
      
      {editMode && (
        <WidgetLibrary 
          onAddWidget={(widget) => addWidget(config!, widget)}
        />
      )}
    </div>
  )
}

// Chart widget component
const ChartWidget: React.FC<{
  widget: DashboardWidget
  data: any
}> = ({ widget, data }) => {
  const getChartComponent = () => {
    switch (widget.config.chartType) {
      case 'line':
        return Line
      case 'bar':
        return Bar
      case 'radar':
        return Radar
      case 'doughnut':
        return Doughnut
      default:
        return Line
    }
  }
  
  const ChartComponent = getChartComponent()
  
  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset: any) => ({
      ...dataset,
      backgroundColor: widget.config.colors?.[0] || 'rgba(75, 192, 192, 0.2)',
      borderColor: widget.config.colors?.[1] || 'rgba(75, 192, 192, 1)',
      borderWidth: 2
    }))
  }
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: widget.config.showLegend !== false
      },
      title: {
        display: true,
        text: widget.title
      }
    },
    ...widget.config.chartOptions
  }
  
  return (
    <div className="chart-widget">
      <ChartComponent data={chartData} options={options} />
    </div>
  )
}

// Metric widget for KPIs
const MetricWidget: React.FC<{
  widget: DashboardWidget
  data: any
}> = ({ widget, data }) => {
  const getTrendIcon = () => {
    if (data.trend > 0) return '↑'
    if (data.trend < 0) return '↓'
    return '→'
  }
  
  const getTrendColor = () => {
    const isPositiveTrend = widget.config.higherIsBetter !== false
    if (data.trend > 0) return isPositiveTrend ? 'text-green-600' : 'text-red-600'
    if (data.trend < 0) return isPositiveTrend ? 'text-red-600' : 'text-green-600'
    return 'text-gray-600'
  }
  
  return (
    <div className="metric-widget p-6">
      <h3 className="text-sm font-medium text-gray-600">{widget.title}</h3>
      <div className="mt-2 flex items-baseline">
        <p className="text-3xl font-semibold text-gray-900">
          {formatMetricValue(data.value, widget.config.format)}
        </p>
        {data.trend !== undefined && (
          <p className={`ml-2 flex items-baseline text-sm ${getTrendColor()}`}>
            <span className="mr-1">{getTrendIcon()}</span>
            <span>{Math.abs(data.trend)}%</span>
          </p>
        )}
      </div>
      {data.comparison && (
        <p className="mt-1 text-sm text-gray-600">
          vs. {data.comparison.label}: {formatMetricValue(
            data.comparison.value, 
            widget.config.format
          )}
        </p>
      )}
      {widget.config.showSparkline && data.history && (
        <Sparkline data={data.history} className="mt-4" />
      )}
    </div>
  )
}
```

### 4. Reporting Engine

```python
# backend/analytics/reporting.py
from typing import Dict, List, Optional
import asyncio
from datetime import datetime
from jinja2 import Template
import pdfkit
import xlsxwriter
from io import BytesIO

class ReportGenerator:
    """Comprehensive report generation system"""
    
    def __init__(self, analytics_engine, template_engine):
        self.analytics = analytics_engine
        self.templates = template_engine
        self.formatters = {
            "pdf": PDFFormatter(),
            "excel": ExcelFormatter(),
            "html": HTMLFormatter(),
            "csv": CSVFormatter()
        }
        
    async def generate_report(
        self,
        report_config: Dict
    ) -> Dict:
        """Generate report based on configuration"""
        
        # Validate configuration
        self._validate_config(report_config)
        
        # Gather data
        report_data = await self._gather_report_data(report_config)
        
        # Apply calculations and transformations
        processed_data = self._process_data(
            report_data, 
            report_config.get("calculations", [])
        )
        
        # Generate visualizations
        visualizations = await self._generate_visualizations(
            processed_data,
            report_config.get("visualizations", [])
        )
        
        # Format report
        formatted_reports = {}
        for format in report_config.get("formats", ["pdf"]):
            formatted_reports[format] = await self._format_report(
                format,
                processed_data,
                visualizations,
                report_config
            )
            
        # Store report
        report_record = await self._store_report(
            report_config,
            formatted_reports
        )
        
        return {
            "report_id": report_record["id"],
            "generated_at": report_record["created_at"],
            "formats": list(formatted_reports.keys()),
            "download_urls": {
                format: f"/api/reports/{report_record['id']}/download/{format}"
                for format in formatted_reports
            }
        }
        
    async def _gather_report_data(
        self, 
        config: Dict
    ) -> Dict:
        """Gather data from multiple sources"""
        
        data_sources = config.get("data_sources", [])
        gathered_data = {}
        
        # Parallel data gathering
        tasks = []
        for source in data_sources:
            if source["type"] == "analytics":
                task = self._gather_analytics_data(source)
            elif source["type"] == "database":
                task = self._gather_database_data(source)
            elif source["type"] == "api":
                task = self._gather_api_data(source)
            else:
                continue
                
            tasks.append(task)
            
        results = await asyncio.gather(*tasks)
        
        for i, source in enumerate(data_sources):
            gathered_data[source["name"]] = results[i]
            
        return gathered_data
        
    def _process_data(
        self, 
        data: Dict, 
        calculations: List[Dict]
    ) -> Dict:
        """Apply calculations and transformations"""
        
        processed = data.copy()
        
        for calc in calculations:
            if calc["type"] == "aggregation":
                result = self._apply_aggregation(
                    processed[calc["source"]], 
                    calc["config"]
                )
            elif calc["type"] == "formula":
                result = self._apply_formula(
                    processed, 
                    calc["formula"]
                )
            elif calc["type"] == "pivot":
                result = self._apply_pivot(
                    processed[calc["source"]], 
                    calc["config"]
                )
            else:
                continue
                
            processed[calc["output"]] = result
            
        return processed
        
    async def _format_report(
        self,
        format: str,
        data: Dict,
        visualizations: Dict,
        config: Dict
    ) -> bytes:
        """Format report in specified format"""
        
        formatter = self.formatters.get(format)
        if not formatter:
            raise ValueError(f"Unsupported format: {format}")
            
        # Get template
        template = await self.templates.get_template(
            config.get("template", "default"),
            format
        )
        
        # Prepare context
        context = {
            "title": config.get("title", "Analytics Report"),
            "subtitle": config.get("subtitle", ""),
            "generated_at": datetime.utcnow(),
            "period": config.get("period"),
            "data": data,
            "visualizations": visualizations,
            "metadata": config.get("metadata", {})
        }
        
        # Format report
        return await formatter.format(template, context)

class PDFFormatter:
    """PDF report formatter"""
    
    async def format(
        self, 
        template: Template, 
        context: Dict
    ) -> bytes:
        """Generate PDF report"""
        
        # Render HTML template
        html_content = template.render(**context)
        
        # Convert to PDF
        pdf_options = {
            'page-size': 'A4',
            'margin-top': '0.75in',
            'margin-right': '0.75in',
            'margin-bottom': '0.75in',
            'margin-left': '0.75in',
            'encoding': "UTF-8",
            'no-outline': None
        }
        
        pdf_bytes = pdfkit.from_string(
            html_content, 
            False, 
            options=pdf_options
        )
        
        return pdf_bytes

class ExcelFormatter:
    """Excel report formatter"""
    
    async def format(
        self, 
        template: Dict, 
        context: Dict
    ) -> bytes:
        """Generate Excel report"""
        
        output = BytesIO()
        workbook = xlsxwriter.Workbook(output)
        
        # Add formats
        formats = {
            'header': workbook.add_format({
                'bold': True,
                'font_size': 14,
                'align': 'center',
                'valign': 'vcenter'
            }),
            'subheader': workbook.add_format({
                'bold': True,
                'font_size': 12
            }),
            'data': workbook.add_format({
                'align': 'left',
                'valign': 'top'
            }),
            'number': workbook.add_format({
                'num_format': '#,##0.00'
            }),
            'percentage': workbook.add_format({
                'num_format': '0.00%'
            })
        }
        
        # Create worksheets based on template
        for sheet_config in template.get("sheets", []):
            worksheet = workbook.add_worksheet(sheet_config["name"])
            
            # Write header
            worksheet.write(0, 0, context["title"], formats['header'])
            worksheet.write(1, 0, context["subtitle"], formats['subheader'])
            
            # Write data
            row_offset = 3
            for section in sheet_config["sections"]:
                data = context["data"].get(section["data_source"])
                if not data:
                    continue
                    
                # Write section header
                worksheet.write(
                    row_offset, 
                    0, 
                    section["title"], 
                    formats['subheader']
                )
                row_offset += 2
                
                # Write data table
                if isinstance(data, pd.DataFrame):
                    # Write column headers
                    for col_idx, col_name in enumerate(data.columns):
                        worksheet.write(
                            row_offset, 
                            col_idx, 
                            col_name, 
                            formats['subheader']
                        )
                    row_offset += 1
                    
                    # Write data rows
                    for row_idx, row in data.iterrows():
                        for col_idx, value in enumerate(row):
                            cell_format = formats['data']
                            if isinstance(value, (int, float)):
                                cell_format = formats['number']
                            worksheet.write(
                                row_offset + row_idx, 
                                col_idx, 
                                value, 
                                cell_format
                            )
                    row_offset += len(data) + 2
                    
            # Add charts if specified
            if "charts" in sheet_config:
                for chart_config in sheet_config["charts"]:
                    chart = self._create_chart(
                        workbook, 
                        chart_config, 
                        context
                    )
                    worksheet.insert_chart(
                        chart_config["position"], 
                        chart
                    )
                    
        workbook.close()
        output.seek(0)
        
        return output.read()

class ScheduledReports:
    """Scheduled report generation system"""
    
    def __init__(self, report_generator, scheduler):
        self.generator = report_generator
        self.scheduler = scheduler
        
    async def schedule_report(
        self,
        schedule_config: Dict
    ) -> str:
        """Schedule recurring report generation"""
        
        job_id = self.scheduler.add_job(
            self._generate_scheduled_report,
            trigger=schedule_config["trigger"],
            args=[schedule_config],
            id=schedule_config.get("job_id"),
            name=schedule_config["name"],
            misfire_grace_time=300
        )
        
        # Store schedule configuration
        await self.db.scheduled_reports.insert_one({
            "job_id": job_id,
            "config": schedule_config,
            "created_at": datetime.utcnow(),
            "next_run": self.scheduler.get_job(job_id).next_run_time
        })
        
        return job_id
        
    async def _generate_scheduled_report(
        self, 
        config: Dict
    ):
        """Generate and distribute scheduled report"""
        
        # Generate report
        report = await self.generator.generate_report(config["report_config"])
        
        # Distribute to recipients
        await self._distribute_report(
            report, 
            config["distribution"]
        )
        
        # Log execution
        await self.db.report_executions.insert_one({
            "job_id": config.get("job_id"),
            "report_id": report["report_id"],
            "executed_at": datetime.utcnow(),
            "status": "completed",
            "recipients": config["distribution"]["recipients"]
        })
```

## API Specifications

### Analytics Data Endpoints

#### POST /api/analytics/events
Track analytics events
```json
{
  "events": [
    {
      "eventType": "learning_activity",
      "eventCategory": "learning",
      "eventAction": "complete_lesson",
      "eventLabel": "python_basics_01",
      "eventValue": 95,
      "properties": {
        "duration": 1800,
        "completed": true
      }
    }
  ]
}
```

#### GET /api/analytics/learning-patterns/{userId}
Get learning pattern analysis

#### GET /api/analytics/performance/{userId}
Get performance metrics

#### POST /api/analytics/predict
Get predictions
```json
{
  "type": "dropout_risk",
  "userId": "user-123",
  "timeRange": 30
}
```

### Dashboard Endpoints

#### GET /api/dashboards
List available dashboards

#### GET /api/dashboards/{id}
Get dashboard configuration

#### PUT /api/dashboards/{id}
Update dashboard configuration

#### POST /api/dashboards/{id}/widgets
Add widget to dashboard

### Reporting Endpoints

#### POST /api/reports/generate
Generate report
```json
{
  "title": "Monthly Performance Report",
  "template": "performance_summary",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "data_sources": [
    {
      "type": "analytics",
      "name": "learning_metrics",
      "query": {...}
    }
  ],
  "formats": ["pdf", "excel"],
  "distribution": {
    "email": ["admin@example.com"]
  }
}
```

#### GET /api/reports/{id}
Get report details

#### GET /api/reports/{id}/download/{format}
Download report in specific format

#### POST /api/reports/schedule
Schedule recurring report

## Database Schema

```sql
-- Analytics events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50),
    event_category VARCHAR(50),
    event_action VARCHAR(100),
    event_label VARCHAR(255),
    event_value DECIMAL(10,2),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    properties JSONB,
    context JSONB,
    INDEX idx_events_user_time (user_id, timestamp),
    INDEX idx_events_type_time (event_type, timestamp)
);

-- Aggregated metrics
CREATE TABLE analytics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100),
    metric_value DECIMAL(20,4),
    dimensions JSONB,
    timestamp TIMESTAMP,
    aggregation_level VARCHAR(50),
    UNIQUE(metric_name, dimensions, timestamp, aggregation_level)
);

-- Dashboard configurations
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    description TEXT,
    config JSONB,
    created_by UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    type VARCHAR(50),
    config JSONB,
    data JSONB,
    formats JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Scheduled reports
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(100) UNIQUE,
    name VARCHAR(255),
    config JSONB,
    schedule JSONB,
    next_run TIMESTAMP,
    last_run TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true
);

-- KPI definitions
CREATE TABLE kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    description TEXT,
    formula JSONB,
    target_value DECIMAL(20,4),
    unit VARCHAR(50),
    category VARCHAR(100),
    refresh_interval INTEGER,
    metadata JSONB
);
```

## Data Pipeline Architecture

### Stream Processing
```yaml
kafka_topics:
  - name: analytics.events
    partitions: 10
    retention_ms: 604800000  # 7 days
    
  - name: analytics.metrics
    partitions: 5
    retention_ms: 2592000000  # 30 days

stream_processors:
  - name: event_aggregator
    input: analytics.events
    output: analytics.metrics
    window: 5m
    aggregations:
      - count
      - sum
      - avg
      - percentiles: [50, 95, 99]
```

### Batch Processing
```python
# Daily aggregation job
class DailyAggregationJob:
    async def run(self):
        # Aggregate daily metrics
        await self.aggregate_user_metrics()
        await self.aggregate_content_metrics()
        await self.aggregate_system_metrics()
        
        # Calculate KPIs
        await self.calculate_daily_kpis()
        
        # Update ML models
        await self.update_prediction_models()
```

## Performance Optimization

### Query Optimization
- Materialized views for common aggregations
- Time-series optimized tables
- Columnar storage for analytical queries
- Query result caching

### Caching Strategy
```python
cache_config = {
    # Dashboard data cache (TTL: 5 minutes)
    "dashboard_data": {
        "key": "analytics:dashboard:{dashboard_id}:{hash(filters)}",
        "ttl": 300
    },
    
    # Report cache (TTL: 1 hour)
    "generated_reports": {
        "key": "analytics:report:{report_id}:{format}",
        "ttl": 3600
    },
    
    # Metrics cache (TTL: 1 minute)
    "real_time_metrics": {
        "key": "analytics:metrics:{metric_name}:{dimensions}",
        "ttl": 60
    }
}
```

## Monitoring & Alerting

### Key Metrics
- Event ingestion rate
- Query performance (p50, p95, p99)
- Dashboard load times
- Report generation times
- Data freshness

### Alert Rules
```yaml
alerts:
  - name: high_dropout_risk
    condition: dropout_probability > 0.8
    actions:
      - notify_instructor
      - trigger_intervention
      
  - name: low_engagement
    condition: daily_minutes < 10 for 7 days
    actions:
      - send_reminder
      - notify_support
      
  - name: system_performance
    condition: query_latency_p99 > 5s
    actions:
      - page_oncall
      - scale_resources
```

## Implementation Roadmap (根據 PRD)

### Phase 1-2: MVP (2025/01-06) - 基礎分析
- [x] Google Analytics 整合
- [x] Local Storage 進度追蹤
- [ ] 基礎使用統計 (頁面訪問、功能使用)
- [ ] 簡單的錯誤追蹤
- [ ] CSV 匯出功能

### Phase 2: Enhanced MVP (2025/07-09) - 學習分析
- [ ] 後端事件收集 API
- [ ] 學習進度追蹤系統
- [ ] 基礎學習報表
- [ ] Redis 事件快取
- [ ] 每日/週報自動生成

### Phase 3: Production (2025/10-12) - 進階分析
- [ ] PostgreSQL 事件儲存
- [ ] 即時分析儀表板
- [ ] 學習路徑分析
- [ ] A/B 測試框架
- [ ] 自訂報表產生器

### Phase 4+: Scale (2026+) - AI 驅動分析
- [ ] 預測性學習分析
- [ ] AI 異常檢測
- [ ] 個人化學習建議
- [ ] 跨平台分析整合
- [ ] 企業級報表系統

## 技術考量

### 隱私與合規
1. **資料最小化**：只收集必要的資料
2. **匿名化**：移除個人識別資訊
3. **資料保留**：定期清理舊資料
4. **使用者控制**：提供資料刪除選項

### 效能優化
- 批次事件發送減少網路請求
- 客戶端快取減少重複計算
- 非同步處理避免阻塞使用者操作
- 漸進式載入大型報表資料