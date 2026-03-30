import Flags from 'country-flag-icons/react/3x2';

interface CountryFlagProps {
  countryCode: string | null;
  size?: number;
}

export function CountryFlag({ countryCode, size = 16 }: CountryFlagProps) {
  if (!countryCode) return null;

  const code = countryCode.toUpperCase() as keyof typeof Flags;
  const FlagComponent = Flags[code];
  if (!FlagComponent) return null;

  return (
    <FlagComponent
      style={{ width: size, height: Math.round(size * 2 / 3), display: 'inline-block', verticalAlign: 'middle' }}
      title={countryCode}
    />
  );
}
