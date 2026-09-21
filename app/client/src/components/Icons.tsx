import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const AllocationIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <circle cx="9" cy="7" r="3.5" />
    <path d="M2.5 20c0-3.6 3-6.2 6.5-6.2s6.5 2.6 6.5 6.2" />
    <path d="M16 4.5c1.7.4 3 2 3 3.9 0 1.9-1.3 3.5-3 3.9" />
    <path d="M20 20c0-2.9-1.9-5.2-4.5-6" />
  </svg>
);

export const ProjectsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </svg>
);

export const CompletedIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>
);

export const TeamIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <circle cx="8" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M2.5 20c0-3.3 2.5-5.8 5.5-5.8s5.5 2.5 5.5 5.8" />
    <path d="M15 14.5c2.4.3 4 2.3 4 4.5" />
  </svg>
);

export const ChevronRight = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={12} height={12}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const ChevronDown = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={12} height={12}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const CalendarIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18M8 3v3M16 3v3" />
  </svg>
);

export const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={17} height={17}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const MailIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={13} height={13}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3.5 6.5l8.5 6 8.5-6" />
  </svg>
);

export const PhoneIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={13} height={13}>
    <path d="M5.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2 17 17 0 0 1-13.3-13.3 2 2 0 0 1 2-2.2z" />
  </svg>
);

export const PinIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={13} height={13}>
    <path d="M12 21s-7-6.3-7-11.5a7 7 0 1 1 14 0C19 14.7 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.3" />
  </svg>
);

export const CalendarDotIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={13} height={13}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18" />
  </svg>
);

export const BriefingIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M4 5h16v11H9l-4 4v-4H4z" />
    <path d="M8 9.5h8M8 13h5" />
  </svg>
);

export const HistoryIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)}>
    <path d="M3 12a9 9 0 1 0 2.6-6.3" />
    <path d="M3 4.5V9h4.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const UndoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={14} height={14}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h9a6 6 0 0 1 0 12h-2" />
  </svg>
);

export const PlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={13} height={13}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const PencilIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={12} height={12}>
    <path d="M4 20l1-4.5L16.5 4l3.5 3.5L8.5 19 4 20z" />
    <path d="M14 6.5l3.5 3.5" />
  </svg>
);

export const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...base(props)} width={14} height={14}>
    <path d="M4 12l5 5L20 6" />
  </svg>
);
