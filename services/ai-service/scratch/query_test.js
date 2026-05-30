

const payload = {
  message: "গত ৭ দিনে রংপুরে কী কী notice বের হয়েছে?",
  history: []
};

fetch('http://localhost:3004/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => {
    console.log('Response:', JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('Error:', err);
  });
