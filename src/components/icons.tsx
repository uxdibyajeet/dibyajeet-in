import type { ReactElement } from "react";

const LOGO_VIEW_BOX = "0 0 36 21";

function renderLogo(className?: string, viewBox?: string): ReactElement {
  return (
    <svg
      className={className}
      viewBox={viewBox ?? LOGO_VIEW_BOX}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5.16786 5.38594C3.05158 5.38594 1.1742 6.40537 0 7.97992C1.1742 9.55447 3.05158 10.574 5.16786 10.574C7.28409 10.574 9.16144 9.55447 10.3357 7.97992C9.16144 6.40537 7.28078 5.38594 5.16786 5.38594ZM5.16787 9.24162C4.47141 9.24162 3.90619 8.67633 3.90619 7.97991C3.90619 7.28349 4.47141 6.7182 5.16787 6.7182C5.86434 6.7182 6.42954 7.28349 6.42954 7.97991C6.42954 8.67633 5.86434 9.24162 5.16787 9.24162Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32.1477 20.7986C34.2753 20.7986 36.0001 19.0738 36.0001 16.9462C36.0001 14.8186 34.2753 13.0939 32.1477 13.0939C30.0201 13.0939 28.2954 14.8186 28.2954 16.9462C28.2954 19.0738 30.0201 20.7986 32.1477 20.7986Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M25.7723 10.5001C25.7723 16.1894 21.1596 20.8021 15.4703 20.8021H6.42993C5.73348 20.8021 5.16825 20.2369 5.16825 19.5405V12.014C7.64451 12.014 10.0097 10.8298 11.4901 8.84137L12.1327 7.98007L11.4901 7.11877C10.0064 5.13372 7.64115 3.94608 5.16825 3.94608V1.45968C5.16825 0.763226 5.73348 0.197998 6.42993 0.197998H15.4703C21.1596 0.197998 25.7723 4.81071 25.7723 10.5001Z"
      />
    </svg>
  );
}

/**
 * Global icon renderer. The site logo is the only inline SVG; every other
 * name renders as a Bootstrap Icons font class.
 *   {renderIcon("img-logo", "logo")}
 *   {renderIcon("github", "icon")}   -> <i class="bi bi-github icon">
 */
export function renderIcon(name: string, className?: string): ReactElement | null {
  if (name === "img-logo") return renderLogo(className);
  return <i className={["bi", `bi-${name}`, className].filter(Boolean).join(" ")} />;
}

/** Functional component wrapper around renderIcon. */
export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}): ReactElement | null {
  return renderIcon(name, className);
}