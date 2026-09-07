async function test() {
  try {
    const res = await fetch('https://eteams.edaraproperty.net/api/users');
    console.log(res.status);
  } catch (err) { console.error(err); }
  process.exit(0);
}
test();
