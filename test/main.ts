function greet(name: string): string {
    return `Hello, ${name}!`;
}

Deno.serve({ port: 8123 }, (request: Request) => {
   return serveFile
});