/**
 * Parent layout — renders parent pages without the dashboard sidebar/top-bar.
 * This route group intercepts /parent and renders a standalone page.
 */
export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
