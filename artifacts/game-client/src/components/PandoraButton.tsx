export function PandoraButton({
  children,
  onClick,
  disabled,
  type = "button",
  "data-testid": testId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  "data-testid"?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="w-full px-9 py-4 font-bold uppercase tracking-widest border transition-all duration-200 disabled:opacity-10 disabled:cursor-not-allowed"
      style={{ borderColor: "#9b59b6", background: "rgba(0,0,0,0.8)", color: "#9b59b6" }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.background = "#9b59b6";
        (e.currentTarget as HTMLButtonElement).style.color = "white";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.8)";
        (e.currentTarget as HTMLButtonElement).style.color = "#9b59b6";
      }}
    >
      {children}
    </button>
  );
}
