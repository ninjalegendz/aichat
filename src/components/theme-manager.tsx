
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
                if (settings.primaryColor) {
                    document.documentElement.style.setProperty('--primary', hexToHslString(settings.primaryColor));
                    document.documentElement.style.setProperty('--ring', hexToHslString(settings.primaryColor));
                }
                if (settings.accentColor) {
                    document.documentElement.style.setProperty('--accent', hexToHslString(settings.accentColor));
                }
                if (settings.backgroundColor) {
                    document.documentElement.style.setProperty('--background', hexToHslString(settings.backgroundColor));
                }
            } catch (error) {
                console.error("Failed to apply theme settings:", error);
            }
        };

        const resetToDefaultTheme = () => {
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--ring');
            document.documentElement.style.removeProperty('--accent');
            document.documentElement.style.removeProperty('--background');
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
