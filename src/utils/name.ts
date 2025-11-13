export function validVarName(varName: string): boolean {
    const varNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    return varNameRegex.test(varName);
}

export function validTagName(tagName: string): boolean {
    const firstUppercase = /^[A-Z]/.test(tagName);
    return validVarName(tagName) && firstUppercase;
}
