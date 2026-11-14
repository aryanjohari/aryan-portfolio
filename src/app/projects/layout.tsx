export default function ProjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main id="main" className="site-main">{children}</main>;
}
