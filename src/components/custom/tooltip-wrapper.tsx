import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip"
import { ReactNode } from "react"

type TooltipWrapperProps = {
    children: ReactNode
    tooltipContent: string
}

export function TooltipWrapper({ children, tooltipContent }: TooltipWrapperProps) {
    if (!tooltipContent) return <>{children}</>

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip >
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipContent}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
