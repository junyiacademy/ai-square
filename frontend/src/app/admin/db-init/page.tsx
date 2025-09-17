'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, RefreshCw, Database, Users, BookOpen, Compass, Gamepad2 } from 'lucide-react';

interface ModuleStatus {
  users: { count: number; details: { email: string; role: string }[] };
  assessment: { count: number; details: Record<string, unknown> | null };
  pbl: { count: number; details: Record<string, unknown> | null };
  discovery: { count: number; details: Record<string, unknown> | null };
}

interface InitResult {
  success: boolean;
  message?: string;
  error?: string;
  results?: Record<string, unknown>;
}

export default function DatabaseInitPage() {
  const [status, setStatus] = useState<ModuleStatus>({
    users: { count: 0, details: [] },
    assessment: { count: 0, details: null },
    pbl: { count: 0, details: null },
    discovery: { count: 0, details: null }
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check status on load
  useEffect(() => {
    checkAllStatus();
  }, []);

  const checkAllStatus = async () => {
    setLoading('checking');
    try {
      // Check users
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();

      // Check scenarios
      const assessmentRes = await fetch('/api/assessment/scenarios');
      const assessmentData = await assessmentRes.json();

      const pblRes = await fetch('/api/pbl/scenarios');
      const pblData = await pblRes.json();

      const discoveryRes = await fetch('/api/discovery/scenarios');
      const discoveryData = await discoveryRes.json();

      setStatus({
        users: {
          count: usersData.users?.length || 0,
          details: usersData.users || []
        },
        assessment: {
          count: assessmentData.data?.scenarios?.length || 0,
          details: assessmentData.data?.scenarios || []
        },
        pbl: {
          count: pblData.data?.scenarios?.length || 0,
          details: pblData.data?.scenarios || []
        },
        discovery: {
          count: discoveryData.data?.scenarios?.length || 0,
          details: discoveryData.data?.scenarios || []
        }
      });
    } catch (error) {
      console.error('Error checking status:', error);
      setMessage({ type: 'error', text: 'Failed to check status' });
    } finally {
      setLoading(null);
    }
  };

  const initModule = async (module: string, endpoint: string, options: { force?: boolean; clean?: boolean } = {}) => {
    setLoading(module);
    setMessage(null);

    try {
      const body = module === 'users'
        ? {
            users: [
              { email: 'student@example.com', password: 'student123', role: 'student', name: 'Demo Student' },
              { email: 'teacher@example.com', password: 'teacher123', role: 'teacher', name: 'Demo Teacher' },
              { email: 'admin@example.com', password: 'admin123', role: 'admin', name: 'Demo Admin' }
            ],
            ...options // Include clean/force options for users too!
          }
        : { ...options }; // Pass force/clean options for PBL, Assessment, Discovery

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data: InitResult = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `${module} initialized successfully: ${data.message || 'Completed'}`
        });
        // Refresh status
        await checkAllStatus();
      } else {
        setMessage({
          type: 'error',
          text: `Failed to initialize ${module}: ${data.error || data.message || 'Unknown error'}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error initializing ${module}: ${error}`
      });
    } finally {
      setLoading(null);
    }
  };

  const clearAndReinit = async (module: string, endpoint: string) => {
    if (!confirm(`Are you sure you want to clear and reinitialize ${module}? This will delete all existing data.`)) {
      return;
    }

    // Pass clean flag to delete all data first, then reinitialize
    await initModule(module, endpoint, { clean: true });
  };

  const addNewOnly = async (module: string, endpoint: string) => {
    // Just initialize - it will skip existing data by default
    await initModule(module, endpoint);
  };

  const updateExisting = async (module: string, endpoint: string) => {
    if (!confirm(`This will update all existing ${module} data. Continue?`)) {
      return;
    }
    // Pass force flag to update existing data
    await initModule(module, endpoint, { force: true });
  };

  const modules = [
    {
      key: 'users',
      name: 'Users',
      icon: Users,
      endpoint: '/api/admin/seed-users',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      key: 'assessment',
      name: 'Assessment',
      icon: Gamepad2,
      endpoint: '/api/admin/init-assessment',
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      key: 'pbl',
      name: 'PBL',
      icon: BookOpen,
      endpoint: '/api/admin/init-pbl',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      key: 'discovery',
      name: 'Discovery',
      icon: Compass,
      endpoint: '/api/admin/init-discovery',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="w-8 h-8" />
          Database Initialization Manager
        </h1>
        <p className="text-gray-600 mt-2">
          Check and initialize database modules for AI Square
        </p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
          <AlertDescription className="flex items-center gap-2">
            {message.type === 'success' ?
              <CheckCircle className="w-4 h-4 text-green-500" /> :
              <XCircle className="w-4 h-4 text-red-500" />
            }
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <Button
          onClick={checkAllStatus}
          disabled={loading === 'checking'}
          variant="outline"
          className="flex items-center gap-2"
        >
          {loading === 'checking' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh Status
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          const moduleStatus = status[module.key as keyof ModuleStatus];
          const count = moduleStatus.count;
          const hasData = count > 0;

          return (
            <Card key={module.key} className="relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 ${module.bgColor} rounded-bl-full opacity-20`} />

              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${module.color}`} />
                    {module.name}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasData ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {count} items
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <XCircle className="w-4 h-4" />
                        Empty
                      </span>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent>
                {hasData && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                    <p className="text-sm font-medium mb-2">Current Data:</p>
                    {module.key === 'users' && moduleStatus.details && (
                      <ul className="text-xs space-y-1">
                        {(moduleStatus.details as { email: string; role: string }[]).slice(0, 5).map((user: { email: string; role: string }, idx: number) => (
                          <li key={idx} className="text-gray-600">
                            • {user.email} ({user.role})
                          </li>
                        ))}
                        {Array.isArray(moduleStatus.details) && moduleStatus.details.length > 5 && (
                          <li className="text-gray-400">
                            ... and {moduleStatus.details.length - 5} more
                          </li>
                        )}
                      </ul>
                    )}
                    {module.key !== 'users' && (
                      <p className="text-xs text-gray-600">
                        {module.key === 'assessment' && `${count} assessment scenario(s)`}
                        {module.key === 'pbl' && `${count} PBL scenario(s)`}
                        {module.key === 'discovery' && `${count} discovery scenario(s)`}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {!hasData && (
                    <Button
                      onClick={() => initModule(module.key, module.endpoint)}
                      disabled={loading === module.key}
                      className="flex-1"
                      variant="default"
                    >
                      {loading === module.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Initialize'
                      )}
                    </Button>
                  )}

                  {hasData && module.key !== 'users' && (
                    <>
                      <Button
                        onClick={() => addNewOnly(module.key, module.endpoint)}
                        disabled={loading === module.key}
                        className="flex-1"
                        variant="default"
                        title="Add new items only, skip existing ones"
                      >
                        {loading === module.key ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Add New Only'
                        )}
                      </Button>
                      <Button
                        onClick={() => updateExisting(module.key, module.endpoint)}
                        disabled={loading === module.key}
                        className="flex-1"
                        variant="secondary"
                        title="Update all existing items with latest data"
                      >
                        {loading === module.key ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Update All'
                        )}
                      </Button>
                      <Button
                        onClick={() => clearAndReinit(module.key, module.endpoint)}
                        disabled={loading === module.key}
                        className="flex-1"
                        variant="destructive"
                        title="Delete everything and start fresh"
                      >
                        {loading === module.key ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Clear All'
                        )}
                      </Button>
                    </>
                  )}

                  {hasData && module.key === 'users' && (
                    <Button
                      onClick={() => clearAndReinit(module.key, module.endpoint)}
                      disabled={loading === module.key}
                      className="flex-1"
                      variant="destructive"
                    >
                      {loading === module.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Clear & Reinitialize'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Initialize</strong>: Add initial data to empty modules</li>
          <li>• <strong>Add New Only</strong>: Add new scenarios/data, skip existing ones (smart sync)</li>
          <li>• <strong>Update All</strong>: Update existing data with latest version from YAML files</li>
          <li>• <strong>Clear All</strong>: Delete everything and start fresh (destructive)</li>
          <li>• Use &quot;Refresh Status&quot; to check current database state</li>
        </ul>
        <div className="mt-3 p-3 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> For PBL scenarios, &quot;Add New Only&quot; is the safest option - it will only add the new semiconductor_adventure scenario without affecting existing data.
          </p>
        </div>
      </div>
    </div>
  );
}
