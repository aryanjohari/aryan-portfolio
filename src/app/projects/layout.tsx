export default function ProjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main className="site-main site-main--project">{children}</main>;
}
