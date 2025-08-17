import React, { useState, useMemo } from 'react';
import type { Course, Reservation } from './index.tsx';

interface CreateCoursePageProps {
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  reservations: Reservation[];
}

const initialCourseState = {
    name: '',
    slots: 0,
    info: '',
    color: '#d32f2f',
};

const CreateCoursePage = ({ courses, setCourses, reservations }: CreateCoursePageProps) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCourse, setNewCourse] = useState(initialCourseState);
    const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());
    const [isSelectingDates, setIsSelectingDates] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);

    const daysOfWeek = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

    const toDateString = (date: Date) => date.toISOString().split('T')[0];
    
    const getCourseForDate = (dateString: string) => {
        return courses.find(course => course.dates.includes(dateString));
    };

    const handleDayClick = (day: number) => {
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateString = toDateString(clickedDate);
        const courseOnThisDay = getCourseForDate(dateString);

        if (isSelectingDates) {
            if (courseOnThisDay && courseOnThisDay.id !== editingCourse?.id) {
                alert("Ten dzień jest już zarezerwowany.");
                return;
            }

            setPendingDates(prevDates => {
                const newDates = new Set(prevDates);
                if (newDates.has(dateString)) {
                    newDates.delete(dateString);
                } else {
                    newDates.add(dateString);
                }
                return newDates;
            });
        } else {
            if (courseOnThisDay) {
                if(courseOnThisDay.isIndividual) {
                    const reservation = reservations.find(r => r.id === courseOnThisDay.reservationId);
                    if (reservation) setViewingReservation(reservation);
                } else {
                    setEditingCourse(courseOnThisDay);
                    setNewCourse({
                        name: courseOnThisDay.name,
                        slots: courseOnThisDay.slots,
                        info: courseOnThisDay.info,
                        color: courseOnThisDay.color,
                    });
                    setIsModalOpen(true);
                }
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewCourse(prev => ({ ...prev, [name]: name === 'slots' ? parseInt(value, 10) || 0 : value }));
    };

    const handleCreateCourse = () => {
        if (!newCourse.name.trim()) {
            alert("Proszę podać nazwę kursu.");
            return;
        }
        const courseToAdd: Course = {
            id: Date.now().toString(),
            ...newCourse,
            dates: Array.from(pendingDates),
            reservations: 0,
        };
        setCourses(prevCourses => [...prevCourses, courseToAdd]);
        closeModal();
    };
    
    const handleUpdateCourseDetails = () => {
        if (!editingCourse) return;
        setCourses(prev => prev.map(c =>
            c.id === editingCourse.id
                ? { ...c, name: newCourse.name, slots: newCourse.slots, info: newCourse.info, color: newCourse.color }
                : c
        ));
        closeModal();
    };

    const handleDeleteCourse = () => {
        if (!editingCourse) return;
        if (window.confirm(`Czy na pewno chcesz usunąć kurs "${editingCourse.name}"?`)) {
            setCourses(prev => prev.filter(c => c.id !== editingCourse.id));
            closeModal();
        }
    };

    const handleEditDates = () => {
        if (!editingCourse) return;
        setPendingDates(new Set(editingCourse.dates));
        setIsModalOpen(false);
        setIsSelectingDates(true);
    };
    
    const handleUpdateCourseDates = () => {
        if (!editingCourse) return;
        setCourses(prev => prev.map(c =>
            c.id === editingCourse.id ? { ...c, dates: Array.from(pendingDates) } : c
        ));
        cancelSelection();
    };

    const openModal = () => {
        if (pendingDates.size === 0) {
            alert("Proszę wybrać co najmniej jeden dzień na kalendarzu.");
            return;
        }
        setIsModalOpen(true);
        setIsSelectingDates(false);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewCourse(initialCourseState);
        setPendingDates(new Set());
        setEditingCourse(null);
    };

    const startSelection = () => {
        setIsSelectingDates(true);
        setEditingCourse(null);
    };

    const cancelSelection = () => {
        setIsSelectingDates(false);
        setPendingDates(new Set());
        setEditingCourse(null);
    };

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };
    
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const renderCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const today = new Date();

        const firstDayOfMonth = new Date(year, month, 1);
        const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; 

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days = [];

        for (let i = startDayIndex; i > 0; i--) {
            days.push(
                <div key={`prev-${i}`} className="calendar-day padding-day">
                    <span className="day-number">{daysInPrevMonth - i + 1}</span>
                </div>
            );
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = toDateString(date);
            
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const courseOnThisDay = getCourseForDate(dateString);
            const isPending = pendingDates.has(dateString);
            
            const dayClasses = [
                'calendar-day',
                isToday && !courseOnThisDay ? 'current-day' : '',
                courseOnThisDay ? 'course-day' : '',
                courseOnThisDay?.isIndividual ? 'individual-course' : '',
                isPending ? 'pending-day' : ''
            ].filter(Boolean).join(' ');

            const style: React.CSSProperties = {};
            if (courseOnThisDay && !courseOnThisDay.isIndividual) {
                style.backgroundColor = courseOnThisDay.color;
                style.borderColor = courseOnThisDay.color;
            } else if (isPending) {
                style.borderColor = editingCourse?.color || newCourse.color;
            }

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
             days.push(
                <div key={`next-${i}`} className="calendar-day padding-day">
                    <span className="day-number">{i}</span>
                </div>
            );
        }

        return days;
    };
    
    const upcomingCourses = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return courses
            .filter(course => !course.isIndividual) // Exclude individual reservations from this list
            .map(course => {
                if (course.dates.length === 0) return null;
                const courseDates = course.dates.map(d => new Date(d));
                const earliestDate = new Date(Math.min(...courseDates.map(d => d.getTime())));
                return { ...course, earliestDate };
            })
            .filter((course): course is (Course & { earliestDate: Date }) => {
                return course !== null && course.earliestDate >= today;
            })
            .sort((a, b) => a.earliestDate.getTime() - b.earliestDate.getTime())
            .slice(0, 5);
    }, [courses]);

    return (
        <div className="content-page create-course-page">
            <h1>Utwórz kurs</h1>
            <div className="calendar-container">
                <div className="calendar-header">
                    <button onClick={goToPreviousMonth} aria-label="Poprzedni miesiąc">&lt;</button>
                    <h2>{currentDate.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={goToNextMonth} aria-label="Następny miesiąc">&gt;</button>
                </div>
                <div className="calendar-grid day-names">
                    {daysOfWeek.map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="calendar-grid">
                    {renderCalendarDays()}
                </div>
            </div>
            
            <div className="course-actions">
                {!isSelectingDates ? (
                    <button className="create-course-btn" onClick={startSelection}>Stwórz Kurs</button>
                ) : (
                    <div className="selection-actions">
                        <button className="btn-cancel" onClick={cancelSelection}>Anuluj</button>
                        <button className="btn-confirm" onClick={editingCourse ? handleUpdateCourseDates : openModal} disabled={pendingDates.size === 0}>
                            {editingCourse ? 'Zatwierdź daty' : 'Zatwierdź wybór'}
                        </button>
                    </div>
                )}
            </div>
            
            {upcomingCourses.length > 0 && (
                <div className="upcoming-courses-section">
                    <h2>Najbliższe kursy</h2>
                    <div className="upcoming-courses-grid">
                        {upcomingCourses.map(course => {
                            const courseDates = course.dates.map(d => new Date(d)).sort((a,b) => a.getTime() - b.getTime());
                            const startDate = courseDates[0];
                            const endDate = courseDates[courseDates.length - 1];
                            const term = startDate && endDate ? 
                                         (startDate.getTime() === endDate.getTime() ? formatDate(startDate) : `${formatDate(startDate)} - ${formatDate(endDate)}`) 
                                         : 'Brak dat';

                            return (
                                <div key={course.id} className="course-summary-card" style={{backgroundColor: course.color}}>
                                    <h3>{course.name}</h3>
                                    <p><strong>Termin:</strong> {term}</p>
                                    <p><strong>Rezerwacje:</strong> {course.reservations}</p>
                                    <p><strong>Wolne miejsca:</strong> {course.slots}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingCourse ? 'Edytuj kurs' : 'Nowy kurs'}</h2>
                        <p className="modal-instructions">
                            {editingCourse ? 'Zmień dane kursu lub przejdź do edycji dat.' : 'Uzupełnij dane kursu dla wybranych dni.'}
                        </p>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="course-name">Nazwa kursu</label>
                                <input type="text" id="course-name" name="name" value={newCourse.name} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="course-slots">Ilość wolnych miejsc</label>
                                <input type="number" id="course-slots" name="slots" value={newCourse.slots} onChange={handleInputChange} min="0" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="course-info">Dodatkowe informacje</label>
                                <textarea id="course-info" name="info" value={newCourse.info} onChange={handleInputChange}></textarea>
                            </div>
                            <div className="form-group">
                                <label htmlFor="course-color">Wybierz kolor</label>
                                <input type="color" id="course-color" name="color" value={newCourse.color} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="modal-actions">
                             {editingCourse && (
                                <button className="btn-delete" onClick={handleDeleteCourse}>Usuń kurs</button>
                            )}
                            {editingCourse && (
                                <button className="btn-secondary" onClick={handleEditDates}>Zmień daty</button>
                            )}
                            <button className="btn-cancel" onClick={closeModal}>Anuluj</button>
                            <button className="btn-confirm" onClick={editingCourse ? handleUpdateCourseDetails : handleCreateCourse}>
                                {editingCourse ? 'Zapisz zmiany' : 'Stwórz Kurs'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {viewingReservation && (
                <div className="modal-overlay" onClick={() => setViewingReservation(null)}>
                    <div className="modal-content student-details-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Rezerwacja indywidualna</h2>
                        <p><strong>Imię i nazwisko:</strong> {viewingReservation.student.name}</p>
                        <p><strong>Nr telefonu:</strong> {viewingReservation.student.phone}</p>
                        <p><strong>Kategoria:</strong> {viewingReservation.category || 'Brak'}</p>
                         <p>
                            <strong>Terminy:</strong> 
                            {viewingReservation.customDates?.map(d => formatDate(new Date(d))).join(', ') || 'Brak'}
                        </p>
                        <p>
                            <strong>Zaliczka:</strong> 
                            {viewingReservation.advancePaid 
                                ? ` Zapłacono (${viewingReservation.advanceAmount} zł)` 
                                : ' Nie zapłacono'}
                        </p>
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={() => setViewingReservation(null)}>Zamknij</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateCoursePage;