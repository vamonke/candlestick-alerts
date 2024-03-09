import { sendMessage } from "../../../../helpers/send";

export async function GET() {
  await sendMessage(
    `
    A very long message that will be sent to the user. It contains a lot of text and some links:
    \n
    Wallet links: <a href="http://.com/">inline URL</a>
    \n
    <a href="http://www.example.com/">inline URL</a>
    \n
    <code><a href="http://www.example.com/">inline URL</a></code>
    \n
    <pre><a href="http://www.example.com/">inline URL</a></pre>
    \n
    <pre><code class="language-html"><a href="http://www.example.com/">inline URL</a></code></pre>
    `
  );
  return new Response({ ok: true }, { status: 200 });
}
