import React, { useState } from 'react';
import type { Course, Reservation, Student } from './index.tsx';
import { GoogleGenAI, Type } from "@google/genai";

interface ReservationsPageProps {
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  reservations: Reservation[];
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
}

const initialStudentState: Student = {
    name: '',
    pesel: '',
    pkk: '',
    phone: '',
    email: '',
    address: '',
};

const initialFormState = {
    ...initialStudentState,
    courseId: '',
    advanceAmount: 0,
    category: 'B' as 'A' | 'B' | 'C' | 'D',
};

const ReservationsPage = ({ courses, setCourses, reservations, setReservations }: ReservationsPageProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(initialFormState);
    const [isAdvancePaid, setIsAdvancePaid] = useState(false);
    const [isIndividual, setIsIndividual] = useState(false);
    const [pasteData, setPasteData] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    
    // State for individual reservation calendar
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [individualDates, setIndividualDates] = useState<Set<string>>(new Set());
    const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

    const availableCourses = courses.filter(c => c.slots > 0 && !c.isIndividual);
    
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const toDateString = (date: Date) => date.toISOString().split('T')[0];

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
        setIsModalOpen(false);
        setFormData(initialFormState);
        setIsAdvancePaid(false);
        setIsIndividual(false);
        setPasteData('');
        setIndividualDates(new Set());
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'advanceAmount' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            category: e.target.value as 'A' | 'B' | 'C' | 'D',
        }));
    };
    
    const handleParseData = async () => {
        if (!pasteData.trim()) {
            alert("Proszę wkleić dane do przetworzenia.");
            return;
        }
        setIsParsing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const schema = {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'Imię i nazwisko kursanta.' },
                    pesel: { type: Type.STRING, description: 'Numer PESEL.' },
                    pkk: { type: Type.STRING, description: 'Numer PKK (Profil Kandydata na Kierowcę).' },
                    phone: { type: Type.STRING, description: 'Numer telefonu.' },
                    email: { type: Type.STRING, description: 'Adres e-mail.' },
                    address: { type: Type.STRING, description: 'Pełen adres zamieszkania.' },
                },
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Przeanalizuj poniższy tekst i wyodrębnij z niego informacje o kursancie. Zwróć dane w formacie JSON. Tekst jest w języku polskim. Zidentyfikuj imię i nazwisko, numer PESEL, numer PKK, numer telefonu, adres e-mail i adres. Jeśli brakuje którejś informacji, zwróć dla niej pusty ciąg znaków.\n\nTekst: "${pasteData}"`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const parsedData = JSON.parse(response.text);
            setFormData(prev => ({
                ...prev,
                name: parsedData.name || '',
                pesel: parsedData.pesel || '',
                pkk: parsedData.pkk || '',
                phone: parsedData.phone || '',
                email: parsedData.email || '',
                address: parsedData.address || '',
            }));
            
        } catch (error) {
            console.error("Błąd podczas przetwarzania danych:", error);
            alert("Nie udało się przetworzyć danych. Sprawdź konsolę, aby uzyskać więcej informacji.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isIndividual) {
            if (individualDates.size === 0) {
                alert("Proszę wybrać przynajmniej jeden dzień w kalendarzu dla rezerwacji indywidualnej.");
                return;
            }

            const newReservation: Reservation = {
                id: Date.now().toString(),
                courseId: null,
                customDates: Array.from(individualDates),
                category: formData.category,
                student: {
                    name: formData.name,
                    pesel: formData.pesel,
                    pkk: formData.pkk,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address,
                },
                advancePaid: isAdvancePaid,
                advanceAmount: isAdvancePaid ? formData.advanceAmount : 0,
            };

            const newIndividualCourse: Course = {
                id: `ind-${newReservation.id}`,
                name: `Ind: ${formData.name}`,
                slots: 1,
                info: `Rezerwacja indywidualna dla ${formData.name}. Kategoria: ${formData.category}. Kontakt: ${formData.phone}`,
                color: '#757575',
                dates: Array.from(individualDates),
                reservations: 1,
                isIndividual: true,
                reservationId: newReservation.id,
            };
            
            setReservations(prev => [...prev, newReservation]);
            setCourses(prev => [...prev, newIndividualCourse]);

        } else {
             if (!formData.courseId) {
                alert("Proszę wybrać kurs.");
                return;
            }
            const courseToUpdate = courses.find(c => c.id === formData.courseId);
            if (!courseToUpdate || courseToUpdate.slots <= 0) {
                alert("Wybrany kurs jest pełny lub nie istnieje.");
                return;
            }
            const updatedCourses = courses.map(c =>
                c.id === formData.courseId
                    ? { ...c, slots: c.slots - 1, reservations: c.reservations + 1 }
                    : c
            );
            setCourses(updatedCourses);
            
            const newReservation: Reservation = {
                id: Date.now().toString(),
                courseId: formData.courseId,
                category: formData.category,
                student: {
                    name: formData.name,
                    pesel: formData.pesel,
                    pkk: formData.pkk,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address,
                },
                advancePaid: isAdvancePaid,
                advanceAmount: isAdvancePaid ? formData.advanceAmount : 0,
            };
            setReservations(prev => [...prev, newReservation]);
        }
        
        closeModal();
    };

    const renderCalendarModal = () => {
        const daysOfWeek = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
        const getCourseForDate = (dateString: string) => courses.find(c => c.dates.includes(dateString));

        const handleDayClick = (day: number) => {
            const clickedDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
            const dateString = toDateString(clickedDate);

            if (getCourseForDate(dateString)) {
                alert("Ten dzień jest już zarezerwowany.");
                return;
            }

            setIndividualDates(prevDates => {
                const newDates = new Set(prevDates);
                if (newDates.has(dateString)) {
                    newDates.delete(dateString);
                } else {
                    newDates.add(dateString);
                }
                return newDates;
            });
        };

        const renderDays = () => {
            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();
            const firstDayOfMonth = new Date(year, month, 1);
            const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const daysInPrevMonth = new Date(year, month, 0).getDate();

            const days = [];

            for (let i = startDayIndex; i > 0; i--) {
                days.push(<div key={`prev-${i}`} className="calendar-day padding-day"><span className="day-number">{daysInPrevMonth - i + 1}</span></div>);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateString = toDateString(date);
                const courseOnThisDay = getCourseForDate(dateString);
                const isPending = individualDates.has(dateString);

                const dayClasses = ['calendar-day', courseOnThisDay ? 'course-day' : '', isPending ? 'pending-day' : ''].filter(Boolean).join(' ');
                const style = courseOnThisDay ? { backgroundColor: courseOnThisDay.color, borderColor: courseOnThisDay.color, cursor: 'not-allowed' } : (isPending ? {borderColor: '#d32f2f'} : {});
                
                days.push(
                    <div key={`current-${day}`} className={dayClasses} style={style} onClick={() => handleDayClick(day)}>
                        <span className="day-number">{day}</span>
                        {courseOnThisDay && <span className="course-name">{courseOnThisDay.name}</span>}
                    </div>
                );
            }
            const totalDays = days.length;
            const nextPadding = (7 - (totalDays % 7)) % 7;
            for (let i = 1; i <= nextPadding; i++) {
                 days.push(<div key={`next-${i}`} className="calendar-day padding-day"><span className="day-number">{i}</span></div>);
            }
            return days;
        };
        
        return (
             <div className="modal-overlay calendar-modal" onClick={() => setIsCalendarModalOpen(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h2>Wybierz terminy indywidualne</h2>
                     <div className="calendar-container" style={{border: 'none', padding: 0, boxShadow: 'none'}}>
                        <div className="calendar-header">
                            <button onClick={(e) => { e.stopPropagation(); setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));}}>&lt;</button>
                            <h2>{currentCalendarDate.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}</h2>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));}}>&gt;</button>
                        </div>
                        <div className="calendar-grid day-names">{daysOfWeek.map(day => <div key={day}>{day}</div>)}</div>
                        <div className="calendar-grid">{renderDays()}</div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={() => setIsCalendarModalOpen(false)}>Anuluj</button>
                        <button type="button" className="btn-confirm" onClick={() => setIsCalendarModalOpen(false)}>Zatwierdź</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="content-page create-course-page">
            <h1>Rezerwacja</h1>
            <p>Zarządzaj rezerwacjami jazd i egzaminów.</p>

            <div className="page-actions">
                <button className="create-course-btn" onClick={openModal}>Zarezerwuj</button>
            </div>
            
            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
                        <h2>Nowa rezerwacja</h2>
                        <p className="modal-instructions">Uzupełnij dane kursanta i wybierz termin kursu.</p>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="student-name">Imię i nazwisko</label>
                                <input type="text" id="student-name" name="name" value={formData.name} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="student-pesel">Nr PESEL</label>
                                <input type="text" id="student-pesel" name="pesel" value={formData.pesel} onChange={handleInputChange} />
                            </div>
                             <div className="form-group">
                                <label htmlFor="student-pkk">Nr PKK</label>
                                <input type="text" id="student-pkk" name="pkk" value={formData.pkk} onChange={handleInputChange} />
                            </div>
                             <div className="form-group">
                                <label htmlFor="student-phone">Nr telefonu</label>
                                <input type="tel" id="student-phone" name="phone" value={formData.phone} onChange={handleInputChange} required/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="student-email">Adres e-mail</label>
                                <input type="email" id="student-email" name="email" value={formData.email} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="student-address">Adres</label>
                                <textarea id="student-address" name="address" value={formData.address} onChange={handleInputChange}></textarea>
                            </div>

                             <div className="form-group">
                                <label htmlFor="paste-data">Lub wklej dane do automatycznego uzupełnienia</label>
                                <textarea 
                                    id="paste-data" 
                                    value={pasteData} 
                                    onChange={(e) => setPasteData(e.target.value)}
                                    placeholder="Wklej tutaj imię, nazwisko, PESEL, PKK, telefon, email, adres..."
                                    rows={4}
                                />
                                <div className="modal-actions" style={{justifyContent: 'flex-start', marginTop: '8px', padding: 0}}>
                                     <button 
                                        type="button" 
                                        className="btn-secondary" 
                                        onClick={handleParseData} 
                                        disabled={isParsing}
                                    >
                                        {isParsing ? 'Przetwarzanie...' : 'Uzupełnij automatycznie'}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <div className="form-group-inline">
                                    <input type="checkbox" id="advance-paid" checked={isAdvancePaid} onChange={(e) => setIsAdvancePaid(e.target.checked)} />
                                    <label htmlFor="advance-paid">Zaliczka wpłacona</label>
                                </div>
                            </div>
                            {isAdvancePaid && (
                                <div className="form-group">
                                    <label htmlFor="advance-amount">Kwota zaliczki</label>
                                    <input type="number" id="advance-amount" name="advanceAmount" value={formData.advanceAmount} onChange={handleInputChange} min="0" />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Kategoria</label>
                                <div className="category-options">
                                    {(['A', 'B', 'C', 'D'] as const).map(cat => (
                                        <label htmlFor={`cat-${cat}`} key={cat}>
                                            <input type="radio" id={`cat-${cat}`} name="category" value={cat} checked={formData.category === cat} onChange={handleCategoryChange} />
                                            {cat}
                                        </label>
                                    ))}
                                </div>
                            </div>

                             <div className="form-group">
                                <div className="form-group-inline">
                                    <input type="checkbox" id="individual-reservation" checked={isIndividual} onChange={(e) => setIsIndividual(e.target.checked)} />
                                    <label htmlFor="individual-reservation">Rezerwacja indywidualna</label>
                                </div>
                            </div>

                            {isIndividual ? (
                               <div className="form-group">
                                    <label>Terminy indywidualne</label>
                                    <button type="button" className="btn-secondary" style={{width: '100%', padding: '12px'}} onClick={() => setIsCalendarModalOpen(true)}>
                                        {individualDates.size > 0 ? `Wybrano ${individualDates.size} dni` : 'Wybierz daty z kalendarza'}
                                    </button>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label htmlFor="course-select">Termin kursu</label>
                                    <select id="course-select" name="courseId" value={formData.courseId} onChange={handleInputChange} required={!isIndividual}>
                                        <option value="" disabled>Wybierz kurs...</option>
                                        {availableCourses.map(course => {
                                            const sortedDates = course.dates.map(d => new Date(d)).sort((a,b) => a.getTime() - b.getTime());
                                            const term = sortedDates.length > 0 ? formatDate(sortedDates[0]) : 'Brak dat';
                                            return (
                                                <option key={course.id} value={course.id}>
                                                    {`${course.name} (Start: ${term}) - Wolne miejsca: ${course.slots}`}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={closeModal}>Anuluj</button>
                            <button type="submit" className="btn-confirm">Zapisz rezerwację</button>
                        </div>
                    </form>
                </div>
            )}
            {isCalendarModalOpen && renderCalendarModal()}
        </div>
    );
};

export default ReservationsPage;