
const API_BASE_URL = '/api';
const PENDING_BOOKING_STORAGE_KEY = 'koyaPendingBooking';

// Get the HTML elements we need to work with.
const providerFilter = document.getElementById('providerFilter');
const slotSelect = document.getElementById('slotSelect');
const bookingForm = document.getElementById('bookingForm');
const bookButton = document.getElementById('bookButton');
const message = document.getElementById('message');

const bookingConfirmation = document.getElementById('bookingConfirmation');
const bookingIdElement = document.getElementById('bookingId');
const copyBookingIdButton = document.getElementById('copyBookingIdButton');
const copyMessage = document.getElementById('copyMessage');

const appointmentsForm = document.getElementById('appointmentsForm');
const appointmentsEmail = document.getElementById('appointmentsEmail');
const findAppointmentsButton = document.getElementById('findAppointmentsButton');
const appointmentsMessage = document.getElementById('appointmentsMessage');
const appointmentsList = document.getElementById('appointmentsList');

// Store available slots retrieved from the backend.
let availableSlots = [];

// Restore a pending booking request from browser storage.
const loadPendingBookingRequest = () => {
    try {
        const savedRequest = localStorage.getItem(
            PENDING_BOOKING_STORAGE_KEY
        );

        if (!savedRequest) {
            return null;
        }

        const parsedRequest = JSON.parse(savedRequest);

        if (
            typeof parsedRequest.key !== 'string' ||
            !parsedRequest.body ||
            typeof parsedRequest.body.slot_id !== 'string' ||
            typeof parsedRequest.body.name !== 'string' ||
            typeof parsedRequest.body.email !== 'string'
        ) {
            localStorage.removeItem(PENDING_BOOKING_STORAGE_KEY);
            return null;
        }

        return parsedRequest;

    } catch (error) {
        return null;
    }
};

// Keep an idempotency key if a request is still pending.
let pendingRequest = loadPendingBookingRequest();

// Save the pending request before sending it to the backend.
const savePendingBookingRequest = () => {
    try {
        localStorage.setItem(
            PENDING_BOOKING_STORAGE_KEY,
            JSON.stringify(pendingRequest)
        );
    } catch (error) {
        // Booking can still work if browser storage is unavailable.
    }
};

// Clear the pending request after a successful or definitive response.
const clearPendingBookingRequest = () => {
    pendingRequest = null;

    try {
        localStorage.removeItem(PENDING_BOOKING_STORAGE_KEY);
    } catch (error) {
        // Ignore browser storage errors.
    }
};

// Store the email currently being used to view appointments.
let currentAppointmentsEmail = '';

// Display feedback to the patient.
const showMessage = (text, type) => {
    message.textContent = text;
    message.className = type;
};

// Display feedback in the My Appointments section.
const showAppointmentsMessage = (text, type) => {
    appointmentsMessage.textContent = text;
    appointmentsMessage.className = `appointments-message ${type}`;
};

// Hide previous appointment results until the patient requests them again.
const hideAppointments = () => {
    appointmentsList.innerHTML = '';
    appointmentsList.hidden = true;

    showAppointmentsMessage('', '');

    // Prevent the next cancellation from using an outdated email.
    currentAppointmentsEmail = '';
};

// Format appointment dates and times using 12-hour time.
const formatDateTime = (date) => {
    return new Intl.DateTimeFormat('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(new Date(date));
};

// Display available slots in the appointment dropdown.
const displaySlots = () => {
    const selectedProvider = providerFilter.value;

    const filteredSlots = availableSlots.filter((slot) => {
        return !selectedProvider || slot.provider === selectedProvider;
    });

    slotSelect.innerHTML = '';

    const pendingSlotId = pendingRequest?.body?.slot_id;

    if (filteredSlots.length === 0 && !pendingSlotId) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No available appointments';
        slotSelect.appendChild(option);
        slotSelect.disabled = true;
        return;
    }

    slotSelect.disabled = false;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select an appointment';
    placeholder.disabled = true;
    placeholder.selected = true;
    slotSelect.appendChild(placeholder);

    filteredSlots.forEach((slot) => {
        const option = document.createElement('option');

        option.value = slot.id;
        option.textContent =
            `${slot.provider} — ${formatDateTime(slot.start)} to ${formatDateTime(slot.end)}`;

        slotSelect.appendChild(option);
    });

    // Keep a previously submitted slot available for an idempotent retry.
    // It may no longer appear in availableSlots if the first request succeeded.
    if (
        pendingSlotId &&
        !filteredSlots.some((slot) => slot.id === pendingSlotId)
    ) {
        const option = document.createElement('option');

        option.value = pendingSlotId;
        option.textContent = `Pending booking — ${pendingSlotId}`;

        slotSelect.appendChild(option);
    }
};

// Restore the details of a pending request into the booking form.
const restorePendingBookingForm = () => {
    if (!pendingRequest) {
        return;
    }

    document.getElementById('name').value = pendingRequest.body.name;
    document.getElementById('email').value = pendingRequest.body.email;

    slotSelect.value = pendingRequest.body.slot_id;

    showMessage(
        'A previous booking request may still be processing. Submit the same details to safely retry it.',
        'error'
    );
};

// Load available appointment slots from the backend.
const loadSlots = async () => {
    slotSelect.disabled = true;
    slotSelect.innerHTML = '<option value="">Loading available slots...</option>';

    try {
        const response = await fetch(`${API_BASE_URL}/slots`, {
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error('Unable to load appointment slots.');
        }

        const data = await response.json();

        // Only keep slots that are currently available.
        availableSlots = data.slots.filter((slot) => slot.available);

        // Get unique doctor names from the available slots.
        const providers = [
            ...new Set(availableSlots.map((slot) => slot.provider)),
        ];

        // Populate the doctor filter.
        providerFilter.innerHTML = '<option value="">All doctors</option>';

        providers.forEach((provider) => {
            const option = document.createElement('option');
            option.value = provider;
            option.textContent = provider;
            providerFilter.appendChild(option);
        });

        displaySlots();

        // Restore a pending booking after the slots have loaded.
        restorePendingBookingForm();

        if (availableSlots.length === 0 && !pendingRequest) {
            showMessage(
                'There are currently no available appointments.',
                'error'
            );
        } else if (!pendingRequest) {
            showMessage('', '');
        }

    } catch (error) {
        slotSelect.innerHTML =
            '<option value="">Unable to load appointments</option>';

        showMessage(error.message, 'error');
    }
};

// Filter appointments when the patient selects a doctor.
providerFilter.addEventListener('change', () => {
    displaySlots();

    // Preserve the pending slot selection when changing the doctor filter.
    if (pendingRequest) {
        slotSelect.value = pendingRequest.body.slot_id;
    }
});

// Handle appointment booking.
bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const bookingData = {
        slot_id: slotSelect.value,
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
    };

    // Reuse the same key when retrying an identical request.
    const samePendingRequest =
        pendingRequest &&
        JSON.stringify(pendingRequest.body) === JSON.stringify(bookingData);

    if (!samePendingRequest) {
        pendingRequest = {
            key: crypto.randomUUID(),
            body: bookingData,
        };
    }

    // Save the key before making the request.
    savePendingBookingRequest();

    bookButton.disabled = true;
    bookButton.textContent = 'Booking...';

    showMessage('', '');
    bookingConfirmation.hidden = true;
    copyMessage.textContent = '';

    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': pendingRequest.key,
            },
            body: JSON.stringify(bookingData),
        });

        let data;

        try {
            data = await response.json();
        } catch (error) {
            // A server error or timeout may have happened after processing.
            // Preserve the key so the patient can safely retry.
            if (response.status >= 500 || response.status === 408) {
                throw new Error(
                    'The server response was unclear. Please retry the same booking.'
                );
            }

            clearPendingBookingRequest();

            throw new Error(
                'The server returned an invalid response. Please try again.'
            );
        }

        if (!response.ok) {
            // Keep the key when the outcome may be uncertain.
            const uncertainOutcome =
                response.status >= 500 || response.status === 408;

            if (!uncertainOutcome) {
                clearPendingBookingRequest();
            }

            throw new Error(
                data.error ||
                (uncertainOutcome
                    ? 'The server encountered an error. Please retry the same booking.'
                    : 'Unable to complete your booking.')
            );
        }

        // The booking succeeded, so the pending request can be cleared.
        clearPendingBookingRequest();

        // Clear the booking form after a successful booking.
        bookingForm.reset();

        // Display the booking ID in the confirmation section.
        bookingIdElement.textContent = data.id;
        bookingConfirmation.hidden = false;

        // Hide previous appointment results after a new booking.
        hideAppointments();

        // Refresh available slots without loading My Appointments.
        await loadSlots();

        showMessage(
            'Your appointment has been booked successfully!',
            'success'
        );

    } catch (error) {
        // Network failures leave the saved request available for retry.
        showMessage(error.message, 'error');

    } finally {
        bookButton.disabled = false;
        bookButton.textContent = 'Book Appointment';
    }
});

// Copy the booking ID to the patient's clipboard.
copyBookingIdButton.addEventListener('click', async () => {
    const bookingId = bookingIdElement.textContent;

    try {
        await navigator.clipboard.writeText(bookingId);

        copyBookingIdButton.textContent = 'Copied!';
        copyMessage.textContent = 'Booking ID copied successfully.';

    } catch (error) {
        copyMessage.textContent =
            'Unable to copy automatically. Please select and copy the ID.';
    }
});

// Display the patient's appointments.
const displayAppointments = (bookings) => {
    appointmentsList.innerHTML = '';

    if (bookings.length === 0) {
        appointmentsList.innerHTML = `
            <p class="appointments-empty">
                No appointments were found for this email address.
            </p>
        `;
        return;
    }

    bookings.forEach((booking) => {
        const appointmentCard = document.createElement('article');
        appointmentCard.className = 'appointment-item';

        const details = document.createElement('div');
        details.className = 'appointment-details';

        const provider = document.createElement('h3');
        provider.className = 'appointment-provider';
        provider.textContent = `Appointment ${booking.id}`;

        const appointmentInfo = document.createElement('p');
        appointmentInfo.className = 'appointment-info';
        appointmentInfo.textContent =
            `${booking.name} · ${booking.email}`;

        const appointmentDate = document.createElement('p');
        appointmentDate.className = 'appointment-info';
        appointmentDate.textContent =
            `Booked on ${formatDateTime(booking.created_at)}`;

        const slotInfo = document.createElement('p');
        slotInfo.className = 'appointment-info';
        slotInfo.textContent = `Slot ID: ${booking.slot_id}`;

        const status = document.createElement('span');
        status.className = `appointment-status ${booking.status}`;
        status.textContent =
            booking.status.charAt(0).toUpperCase() + booking.status.slice(1);

        details.appendChild(provider);
        details.appendChild(appointmentInfo);
        details.appendChild(appointmentDate);
        details.appendChild(slotInfo);

        const actions = document.createElement('div');
        actions.className = 'appointment-actions';
        actions.appendChild(status);

        if (booking.status === 'confirmed') {
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'cancel-appointment-button';
            cancelButton.textContent = 'Cancel Appointment';
            cancelButton.dataset.bookingId = booking.id;

            actions.appendChild(cancelButton);
        }

        appointmentCard.appendChild(details);
        appointmentCard.appendChild(actions);

        appointmentsList.appendChild(appointmentCard);
    });
};

// Load all bookings belonging to an email address.
const loadAppointments = async (email) => {
    currentAppointmentsEmail = email.trim().toLowerCase();

    // Show the appointment results when the patient requests them.
    appointmentsList.hidden = false;

    appointmentsList.innerHTML = `
        <p class="appointments-empty">Loading your appointments...</p>
    `;

    showAppointmentsMessage('', '');

    findAppointmentsButton.disabled = true;
    findAppointmentsButton.textContent = 'Loading...';

    try {
        const allBookings = [];
        let cursor = null;

        // Fetch every page of results, not just the first 50 bookings.
        do {
            const query = new URLSearchParams({
                email: currentAppointmentsEmail,
                limit: '50',
            });

            if (cursor) {
                query.set('cursor', cursor);
            }

            const response = await fetch(
                `${API_BASE_URL}/bookings?${query.toString()}`,
                { cache: 'no-store' }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || 'Unable to retrieve your appointments.'
                );
            }

            allBookings.push(...data.bookings);
            cursor = data.next_cursor;

        } while (cursor);

        displayAppointments(allBookings);

        showAppointmentsMessage(
            `${allBookings.length} appointment${allBookings.length === 1 ? '' : 's'} found.`,
            'success'
        );

    } catch (error) {
        appointmentsList.innerHTML = `
            <p class="appointments-empty">
                Unable to load your appointments.
            </p>
        `;

        showAppointmentsMessage(error.message, 'error');

    } finally {
        findAppointmentsButton.disabled = false;
        findAppointmentsButton.textContent = 'Find My Appointments';
    }
};

// Find appointments only when the patient submits their email.
appointmentsForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = appointmentsEmail.value.trim().toLowerCase();

    if (!email) {
        showAppointmentsMessage(
            'Please enter your email address.',
            'error'
        );
        return;
    }

    await loadAppointments(email);
});

// Cancel an appointment.
appointmentsList.addEventListener('click', async (event) => {
    const cancelButton = event.target.closest('.cancel-appointment-button');

    if (!cancelButton) {
        return;
    }

    const bookingId = cancelButton.dataset.bookingId;

    const confirmed = window.confirm(
        'Are you sure you want to cancel this appointment?'
    );

    if (!confirmed) {
        return;
    }

    cancelButton.disabled = true;
    cancelButton.textContent = 'Cancelling...';

    try {
        const response = await fetch(
            `${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}`,
            {
                method: 'DELETE',
                cache: 'no-store',
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || 'Unable to cancel this appointment.'
            );
        }

        // Hide the previous booking confirmation completely.
        showMessage('', '');
        bookingConfirmation.hidden = true;
        copyMessage.textContent = '';

        showAppointmentsMessage(
            'Your appointment has been cancelled successfully.',
            'success'
        );

        // Reload the list so the updated status is displayed.
        await loadAppointments(currentAppointmentsEmail);

        // The cancelled slot should now be available again.
        await loadSlots();

        // Restore the cancellation success message after refreshing.
        showAppointmentsMessage(
            'Your appointment has been cancelled successfully.',
            'success'
        );

    } catch (error) {
        showAppointmentsMessage(error.message, 'error');

        cancelButton.disabled = false;
        cancelButton.textContent = 'Cancel Appointment';
    }
});

// Load available appointments when the page opens.
loadSlots();
