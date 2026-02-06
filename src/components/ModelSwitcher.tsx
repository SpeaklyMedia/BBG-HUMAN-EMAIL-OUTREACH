import { useRouter } from "next/router";

type LinkItem = { label: string; href: string };

const LINKS: LinkItem[] = [
  { label: "Outreach Dashboard", href: "/" },
  { label: "Email Automation Map", href: "/arch1-flowgraph" },
  { label: "BEValuator Scenarios", href: "/bevaluator-scenarios" }
];

export default function ModelSwitcher() {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <nav aria-label="Model switcher" className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const isActive = currentPath === link.href;
        const className = isActive ? "btn btn-primary" : "btn";
        return (
          <button
            key={link.href}
            type="button"
            className={className}
            aria-current={isActive ? "page" : undefined}
            onClick={() => router.push(link.href)}
          >
            {link.label}
          </button>
        );
      })}
    </nav>
  );
}
