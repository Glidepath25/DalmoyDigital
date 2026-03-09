import Image from "next/image";
import clsx from "clsx";

import { dalmoyBrand } from "@/lib/brand/tokens";

type LogoSize = "sm" | "md" | "lg";
type LogoSurface = "dark" | "light";

const SIZE_MAP: Record<LogoSize, { width: number; height: number; padding: string }> = {
  sm: { width: 128, height: 48, padding: "px-2 py-1.5" },
  md: { width: 164, height: 62, padding: "px-3 py-2" },
  lg: { width: 210, height: 79, padding: "px-4 py-3" }
};

export function DalmoyLogo(props: {
  size?: LogoSize;
  surface?: LogoSurface;
  className?: string;
  priority?: boolean;
}) {
  const size = props.size ?? "md";
  const surface = props.surface ?? "dark";
  const { width, height, padding } = SIZE_MAP[size];

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-xl",
        surface === "light" ? `bg-brand-shell ${padding}` : "p-0",
        props.className
      )}
    >
      <Image
        alt="Dalmoy"
        height={height}
        priority={props.priority}
        src={dalmoyBrand.assets.logoSecondary}
        width={width}
      />
    </span>
  );
}

