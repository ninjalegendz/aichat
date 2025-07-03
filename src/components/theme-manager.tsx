
'use client';

import { getSettingsAction } from '@/app/actions';
import { hexToHslString } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function ThemeManager({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        const applyCustomerTheme = async () => {
            try {
                const settings = await getSettingsAction();
                const style = document.documentElement.style;
                // General Theme
                if (settings.primaryColor) {
                    style.setProperty('--primary', hexToHslString(settings.primaryColor));
                    style.setProperty('--ring', hexToHslString(settings.primaryColor));
                }
                if (settings.accentColor) {
                    style.setProperty('--accent', hexToHslString(settings.accentColor));
                }
                if (settings.backgroundColor) {
                    style.setProperty('--background', hexToHslString(settings.backgroundColor));
                }
                // Bubble Colors
                if (settings.userBubbleColor) style.setProperty('--user-bubble-background', hexToHslString(settings.userBubbleColor));
                if (settings.userBubbleTextColor) style.setProperty('--user-bubble-foreground', hexToHslString(settings.userBubbleTextColor));
                if (settings.agentBubbleColor) style.setProperty('--agent-bubble-background', hexToHslString(settings.agentBubbleColor));
                if (settings.agentBubbleTextColor) style.setProperty('--agent-bubble-foreground', hexToHslString(settings.agentBubbleTextColor));
                if (settings.assistantBubbleColor) style.setProperty('--assistant-bubble-background', hexToHslString(settings.assistantBubbleColor));
                if (settings.assistantBubbleTextColor) style.setProperty('--assistant-bubble-foreground', hexToHslString(settings.assistantBubbleTextColor));

            } catch (error) {
                console.error("Failed to apply theme settings:", error);
            }
        };

        const resetToDefaultTheme = () => {
            const style = document.documentElement.style;
            style.removeProperty('--primary');
            style.removeProperty('--ring');
            style.removeProperty('--accent');
            style.removeProperty('--background');
            style.removeProperty('--user-bubble-background');
            style.removeProperty('--user-bubble-foreground');
            style.removeProperty('--agent-bubble-background');
            style.removeProperty('--agent-bubble-foreground');
            style.removeProperty('--assistant-bubble-background');
            style.removeProperty('--assistant-bubble-foreground');
        }

        // Only apply custom theme to the main customer-facing page (and its embedded version)
        if (pathname === '/') {
            applyCustomerTheme();
        } else {
            resetToDefaultTheme();
        }

    }, [pathname]);

    return <>{children}</>;
}
