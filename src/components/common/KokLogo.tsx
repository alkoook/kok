import { useId } from 'react';

type KokLogoVariant = 'compact' | 'header' | 'hero';

export function KokLogo({ variant, size }: { variant?: KokLogoVariant; size?: 'medium' | 'hero' }) {
  const resolvedVariant = variant ?? (size === 'hero' ? 'hero' : 'header');
  const gradientId = `kok-ink-${useId().replace(/:/g, '')}`;
  return <svg className={`kok-logo kok-logo--${resolvedVariant}`} viewBox="0 0 420 170" role="img" aria-label="KOK">
    <defs><linearGradient id={gradientId} x1="35" y1="12" x2="385" y2="154" gradientUnits="userSpaceOnUse"><stop className="kok-logo__stop kok-logo__stop--start"/><stop offset=".46" className="kok-logo__stop kok-logo__stop--middle"/><stop offset="1" className="kok-logo__stop kok-logo__stop--end"/></linearGradient></defs>
    <g fill={`url(#${gradientId})`}><path d="M44 27Q58 23 72 12l-6 132q-11 8-23 12zm20 55Q101 51 129 9l22 2q-35 49-80 79zm3-5q45 25 87 72l-25 5Q96 113 61 91z"/><path d="M315 24q14-3 28-14l-6 146q-11 7-23 10zm22 58q31-35 52-70l21 2q-29 44-67 76zm3-6q39 27 72 72l-23 6q-24-39-54-63z"/></g>
    <path className="kok-logo__bridge" d="M139 41c18-22 39-33 71-33s54 11 72 33M137 126c20 23 43 32 73 32s52-9 73-32"/>
    <path className="kok-logo__o" d="M210 15c42 0 65 29 65 70s-23 70-65 70-65-29-65-70 23-70 65-70Zm0 13c-31 0-47 23-47 57s16 57 47 57 47-23 47-57-16-57-47-57Z"/>
    <ellipse className="kok-logo__o-inner" cx="210" cy="85" rx="37" ry="48"/><path className="kok-logo__ornament" d="M189 82c7-5 14-15 21-27 7 12 14 22 21 27-7 4-14 13-21 27-7-14-14-23-21-27Zm21-27v54M189 82h42"/><path className="kok-logo__flourish" d="M113 161c39-8 155-8 194 0m-153 0c20 7 92 7 112 0"/>
  </svg>;
}
