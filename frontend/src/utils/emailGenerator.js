/**
 * Sends RSVP data to the backend API.
 * The backend handles both the couple notification and guest confirmation email.
 */
export async function sendEmails(rsvpData) {
	const { guestName, guestEmail, attending, companionCount, companions, diet } = rsvpData;

	const payload = {
		name: guestName,
		email: guestEmail,
		attending,
		guests: companionCount + 1, // main guest + companions
		companions,
		dietary: diet,
	};

	const response = await fetch('/api/rsvp', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const data = await response.json().catch(() => ({}));
		throw new Error(data.error || 'Błąd serwera. Spróbuj ponownie.');
	}

	return response.json();
}
