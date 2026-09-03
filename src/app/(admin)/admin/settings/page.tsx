'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function PlatformSettingsPage() {
  const [rates, setRates] = useState({ usd: 1260, eur: 1475, gbp: 1740 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setRates({
            usd: res.data.suggested_rate_usd || 1260,
            eur: res.data.suggested_rate_eur || 1475,
            gbp: res.data.suggested_rate_gbp || 1740
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        toast.error('Failed to load settings');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggested_rate_usd: rates.usd,
          suggested_rate_eur: rates.eur,
          suggested_rate_gbp: rates.gbp
        })
      });

      if (!res.ok) throw new Error('Failed to save settings');
      
      toast.success('Platform settings updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">
          Manage global configuration and multi-currency exchange rates.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Suggested Exchange Rates</CardTitle>
            <CardDescription>
              These baseline rates are used to mathematically calculate and auto-suggest the premium pricing for foreign subscription tiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>USD Rate (NGN to 1 USD)</Label>
              <Input 
                type="number" 
                value={rates.usd} 
                onChange={(e) => setRates({ ...rates, usd: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>EUR Rate (NGN to 1 EUR)</Label>
              <Input 
                type="number" 
                value={rates.eur} 
                onChange={(e) => setRates({ ...rates, eur: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>GBP Rate (NGN to 1 GBP)</Label>
              <Input 
                type="number" 
                value={rates.gbp} 
                onChange={(e) => setRates({ ...rates, gbp: Number(e.target.value) })}
              />
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="mt-4">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Rates
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
