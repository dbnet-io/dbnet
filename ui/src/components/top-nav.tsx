import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Github, Home, Layout, Plus, Search } from "lucide-react"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "./ui/breadcrumb"
import { SidebarTrigger } from "./ui/sidebar"
import logo from '../assets/logo-brand.png'
import { NavUser } from "./nav-user"
import { NavUserMenu } from "./user-menu"
import { ConnectionChooser } from "./connection-chooser"

export function TopNavOld() {
  return (
    <div className="flex h-14 items-center border-b px-4 lg:px-6">
      <div className="flex items-center gap-2">
        {/* <a href="/" className="flex items-center gap-2 font-semibold">
          <Layout className="h-6 w-6" />
          <span>shadcn/ui</span>
        </a>
        <Separator orientation="vertical" className="h-6" /> */}
        <nav className="hidden md:flex gap-5 text-sm font-medium">
          <a href="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </a>
          <a href="/docs" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <span>Docs</span>
          </a>
          <a href="/components" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <span>Components</span>
          </a>
          <a href="/themes" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <span>Themes</span>
          </a>
        </nav>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Search className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Github className="h-4 w-4" />
          <span className="sr-only">GitHub</span>
        </Button>
        <ModeToggle />
        <Button variant="outline" size="sm" className="ml-4 hidden md:flex">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>
    </div>
  )
} 

export function TopNav() {
  const user = {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  }

  return (
      <header className="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
        <a href="https://dbnet.io" target="_blank">
          <img src={logo} className="h-8 p-0" alt="dbNet logo" />
        </a>
        {/* <Separator orientation="vertical" className="h-6" /> */}
          {/* <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" /> */}
          <ConnectionChooser/>
        </div>
        <div className="ml-auto flex items-center gap-2 px-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
            <Github className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </Button>
          <ModeToggle />
          {/* <NavUserMenu user={user} /> */}
        </div>
      </header>
  )
} 