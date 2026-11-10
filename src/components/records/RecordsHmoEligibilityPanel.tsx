import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import {
  fetchHmoBenefits,
  listHmoPayers,
  type HmoBenefitsResult,
  type HmoEligibilityResult,
  type HmoPayerItem,
  upsertHmoCoverage,
  verifyHmoEligibility,
} from '@/lib/api/insurance-hmo';
import { env } from '@/lib/env';

type Props = {
  personId: number | null;
  memberNo: string;
  onMemberNoChange: (value: string) => void;
  onVerified?: (result: HmoEligibilityResult) => void;
};

export default function RecordsHmoEligibilityPanel({
  personId,
  memberNo,
  onMemberNoChange,
  onVerified,
}: Props) {
  const apiOn = env.offlineDemo || Boolean(env.apiBaseUrl);
  const [payers, setPayers] = useState<HmoPayerItem[]>([]);
  const [payerId, setPayerId] = useState<string>('');
  const [loadingPayers, setLoadingPayers] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [eligibility, setEligibility] = useState<HmoEligibilityResult | null>(null);
  const [benefits, setBenefits] = useState<HmoBenefitsResult | null>(null);

  const loadPayers = useCallback(async () => {
    if (!apiOn) return;
    setLoadingPayers(true);
    try {
      const items = await listHmoPayers();
      setPayers(items);
      if (!payerId && items.length) {
        const mock = items.find((p) => p.code === 'HMO-MOCK') ?? items[0];
        setPayerId(String(mock.payerId));
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load HMO payers');
    } finally {
      setLoadingPayers(false);
    }
  }, [apiOn, payerId]);

  useEffect(() => {
    void loadPayers();
  }, [loadPayers]);

  const runVerify = async () => {
    if (!personId) {
      toast.error('Create the patient record first, then verify HMO eligibility');
      return;
    }
    if (!payerId || !memberNo.trim()) {
      toast.error('Select an HMO and enter the member / enrollee number');
      return;
    }
    setVerifying(true);
    setBenefits(null);
    try {
      await upsertHmoCoverage({
        personId,
        payerId: Number(payerId),
        memberNo: memberNo.trim(),
      });
      const result = await verifyHmoEligibility({
        personId,
        payerId: Number(payerId),
        memberNo: memberNo.trim(),
      });
      setEligibility(result);
      onVerified?.(result);
      if (result.status === 'ACTIVE') {
        toast.success(`HMO coverage ACTIVE — ${result.plan.name ?? result.payer.name}`);
        const b = await fetchHmoBenefits({
          personId,
          payerId: Number(payerId),
          memberNo: memberNo.trim(),
        });
        setBenefits(b);
      } else {
        toast.error(`HMO status: ${result.status}`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'HMO eligibility check failed');
    } finally {
      setVerifying(false);
    }
  };

  const statusColor =
    eligibility?.status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      : eligibility
        ? 'bg-rose-50 text-rose-800 ring-rose-200'
        : 'bg-muted text-muted-foreground';

  return (
    <div className="p-4 rounded-lg ring-1 ring-primary/20 bg-primary/5 space-y-3">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <Shield className="h-4 w-4 text-primary" />
        HMO eligibility (Integration Broker)
      </div>
      <p className="text-xs text-muted-foreground">
        Demo check for this browser. Pick an HMO and enter any enrollee number, for example HYG-123456.
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <Label>HMO / Payer</Label>
          <Select value={payerId} onValueChange={setPayerId} disabled={loadingPayers || !apiOn}>
            <SelectTrigger>
              <SelectValue placeholder={loadingPayers ? 'Loading…' : 'Select HMO'} />
            </SelectTrigger>
            <SelectContent>
              {payers.map((p) => (
                <SelectItem key={p.payerId} value={String(p.payerId)}>
                  {p.name} ({p.integrationStatus})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Member / Enrollee No</Label>
          <Input
            value={memberNo}
            onChange={(e) => onMemberNoChange(e.target.value)}
            placeholder="e.g. HYG-123456"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            className="w-full"
            disabled={verifying || !apiOn}
            onClick={() => void runVerify()}
          >
            {verifying ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <BadgeCheck className="h-4 w-4 mr-1" />
            )}
            {verifying ? 'Verifying…' : 'Verify coverage'}
          </Button>
        </div>
      </div>

      {eligibility && (
        <div className={`p-3 rounded-md ring-1 text-sm ${statusColor}`}>
          <div className="font-semibold">
            Status: {eligibility.status}
            {eligibility.plan.name ? ` · ${eligibility.plan.name}` : ''}
          </div>
          <div className="text-xs mt-1 opacity-90">
            {eligibility.member.fullName ? `Member: ${eligibility.member.fullName} · ` : ''}
            Adapter: {eligibility.sourceAdapter} · Verified {new Date(eligibility.verifiedAt).toLocaleString()}
          </div>
        </div>
      )}

      {benefits && benefits.benefits.length > 0 && (
        <div className="text-xs space-y-1">
          <div className="font-semibold text-sm">Plan benefits</div>
          <ul className="grid md:grid-cols-2 gap-1">
            {benefits.benefits.slice(0, 6).map((b) => (
              <li key={`${b.category}-${b.name}`} className="rounded bg-background/80 px-2 py-1 ring-1 ring-border">
                <span className="font-medium">{b.name}</span>
                {': '}
                {b.covered ? `${b.coveragePercent}% covered` : 'Not covered'}
                {b.limitAmount != null ? ` (limit ₦${b.limitAmount.toLocaleString()})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
