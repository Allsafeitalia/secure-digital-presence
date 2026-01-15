/**
 * Masks an email address for privacy
 * Example: "mario.rossi@gmail.com" -> "m***@g***.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  
  const [localPart, domain] = email.split("@");
  const [domainName, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");
  
  // Mask local part: show first letter + ***
  const maskedLocal = localPart.length > 0 
    ? `${localPart[0]}***` 
    : "***";
  
  // Mask domain name: show first letter + ***
  const maskedDomain = domainName.length > 0 
    ? `${domainName[0]}***` 
    : "***";
  
  return `${maskedLocal}@${maskedDomain}.${tld}`;
}
