import type { SVGProps } from "react";

const baseIconProps = "h-4 w-4";

const Icon = ({ className, children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={[baseIconProps, className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </svg>
);

export const DownloadIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 19h14" />
  </Icon>
);

export const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="m5 13 4 4L19 7" />
  </Icon>
);

export const SaveIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M9 3v5h6V3" />
    <path d="M9 13h6" />
  </Icon>
);

export const UploadIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="m7 9 5-5 5 5" />
    <path d="M12 4v12" />
    <path d="M5 20h14" />
  </Icon>
);

export const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx={11} cy={11} r={7} />
    <path d="m20 20-3-3" />
  </Icon>
);

export const RefreshIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M21 12a9 9 0 1 1-9-9" />
    <path d="M21 3v6h-6" />
  </Icon>
);

export const ChevronRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const FlowIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M6 3h12" />
    <path d="M6 21h12" />
    <path d="M10 3v6h4V3" />
    <path d="M10 21v-6h4v6" />
    <path d="M3 9h4" />
    <path d="M17 15h4" />
  </Icon>
);

export const JsonIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M8 3H6a3 3 0 0 0-3 3v4" />
    <path d="M3 14v4a3 3 0 0 0 3 3h2" />
    <path d="M16 3h2a3 3 0 0 1 3 3v4" />
    <path d="M21 14v4a3 3 0 0 1-3 3h-2" />
  </Icon>
);

export const GraphIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx={6} cy={18} r={2} />
    <circle cx={18} cy={6} r={2} />
    <circle cx={6} cy={6} r={2} />
    <circle cx={18} cy={18} r={2} />
    <path d="M8 6h8M6 8v8m12-8v8M8 18h8" />
  </Icon>
);

export const SplitIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x={4} y={4} width={7} height={16} rx={2} />
    <rect x={13} y={4} width={7} height={16} rx={2} />
  </Icon>
);

export const FolderIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </Icon>
);

export const PathsIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M4 6h6a4 4 0 0 1 4 4v0a4 4 0 0 0 4 4h2" />
    <circle cx={4} cy={6} r={2} />
    <circle cx={20} cy={14} r={2} />
    <circle cx={10} cy={6} r={0.01} />
  </Icon>
);
