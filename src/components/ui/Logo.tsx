interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/logopicfoto.svg"
      alt="Pic Foto"
      width={size}
      height={size}
      className={className}
    />
  );
}
