import React from 'react';
import { Label, Select, HelpText } from '../../../shared/components/FormControls';
import type { LiveContactForm } from '../types/LiveContactForm';

export const CATEGORY_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'CORE_VOLUNTEER_LEADER', label: 'Core Volunteer Leader' },
  { value: 'PRECINCT_CAPTAIN', label: 'Precinct Captain Prospect' },
  { value: 'COUNTY_LEADER', label: 'County Leader Prospect' },
  { value: 'CAMPAIGN_STAFF', label: 'Volunteer Staff / Department Lead' },

  { value: 'DONOR', label: 'Donor Prospect' },
  { value: 'MAJOR_DONOR', label: 'Major Donor Prospect' },
  { value: 'FUNDRAISER', label: 'Fundraiser / Host Prospect' },

  { value: 'COMMUNITY_LEADER', label: 'Community Leader' },
  { value: 'FAITH_LEADER', label: 'Faith Leader' },
  { value: 'BUSINESS_LEADER', label: 'Business Leader / Owner' },
  { value: 'UNION_LEADER', label: 'Union / Labor Leader' },
  { value: 'ADVOCATE', label: 'Advocate / Policy Stakeholder' },

  { value: 'MEDIA', label: 'Media / Press' },
  { value: 'INFLUENCER', label: 'Influencer / Connector' },
  { value: 'PARTNER_ORG', label: 'Partner Organization' },
  { value: 'VENDOR', label: 'Vendor / Service Provider' },

  { value: 'SUPPORTER', label: 'Supporter' },
  { value: 'UNDECIDED_VOTER', label: 'Undecided Voter' },
  { value: 'OPPOSITION', label: 'Opposition / Hostile' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const SUPPORT_LEVEL_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'STRONG_SUPPORT', label: 'Strong support' },
  { value: 'LEAN_SUPPORT', label: 'Lean support' },
  { value: 'UNDECIDED', label: 'Undecided' },
  { value: 'LEAN_OPPOSE', label: 'Lean oppose' },
  { value: 'STRONG_OPPOSE', label: 'Strong oppose' },
] as const;

export const BEST_CONTACT_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'TEXT', label: 'Text' },
  { value: 'CALL', label: 'Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'FB', label: 'Facebook' },
  { value: 'IG', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'IN_PERSON', label: 'In-person' },
] as const;

export function CampaignCategorySection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(k: K, v: LiveContactForm[K]) => void;
}) {
  const { form, update } = props;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="category">Category (how can we plug them in?)</Label>
        <Select id="category" value={form.category} onChange={(e) => update('category', e.target.value as any)}>
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <HelpText>Use this for routing: fundraising, field, volunteer leadership, county leadership, etc.</HelpText>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="supportLevel">Support level</Label>
          <Select id="supportLevel" value={form.supportLevel} onChange={(e) => update('supportLevel', e.target.value as any)}>
            {SUPPORT_LEVEL_OPTIONS.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="bestContactMethod">Best contact method</Label>
          <Select
            id="bestContactMethod"
            value={form.bestContactMethod}
            onChange={(e) => update('bestContactMethod', e.target.value as any)}
          >
            {BEST_CONTACT_OPTIONS.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
