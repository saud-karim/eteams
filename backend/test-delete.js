async function test() {
  try {
    const res = await fetch('http://localhost:4000/api/users/fcm-token', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'test' })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (err) { console.error(err); }
  process.exit(0);
}
test();
