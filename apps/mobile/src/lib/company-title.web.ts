import { useEffect } from "react";

/**
 * The browser tab names the Company the User is working in, as the Admin app's
 * does; screens before a Company is chosen keep the product name (app.json).
 */
export function useCompanyTitle(companyName: string): void {
  useEffect(() => {
    const productTitle = document.title;
    document.title = companyName;
    return () => {
      document.title = productTitle;
    };
  }, [companyName]);
}
