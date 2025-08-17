import React, { useMemo } from 'react';
import type { Course, Reservation, Instructor, ScheduleEntry, CoursePrices } from './index.tsx';

interface HomePageProps {
    courses: Course[];
    reservations: Reservation[];
    instructors: Instructor[];
    schedule: Record<string, ScheduleEntry[]>;
    coursePrices: CoursePrices;
}

const StatCard = ({ number, label }: { number: number; label: string }) => (
    <div className="stat-card">
        <div className="stat-number">{number}</div>
        <div className="stat-label">{label}</div>
    </div>
);

const HomePage = ({ courses, reservations, instructors, schedule, coursePrices }: HomePageProps) => {

    const totalStudents = reservations.length;
    const totalCourses = courses.filter(c => !c.isIndividual).length;
    const totalInstructors = instructors.length;

    const formatCurrency = (amount: number) => {
        return `${amount.toFixed(2).replace(/\.00$/, '')} zł`;
    };
    
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
    };

    const financialSummary = useMemo(() => {
        let totalRevenue = 0;
        let totalPaid = 0;

        reservations.forEach(reservation => {
            const category = reservation.category || 'B';
            const price = coursePrices[category] || 0;
            totalRevenue += price;
            if (reservation.advancePaid) {
                totalPaid += reservation.advanceAmount;
            }
        });

        const totalOutstanding = totalRevenue - totalPaid;

        return { totalRevenue, totalPaid, totalOutstanding };
    }, [reservations, coursePrices]);
    
    const unscheduledItems = useMemo(() => {
        const items: { reservation: Reservation; date: string }[] = [];
        reservations.forEach(res => {
            const reservationDates = res.customDates || courses.find(c => c.id === res.courseId)?.dates || [];
            reservationDates.forEach(dateStr => {
                const dateOnly = dateStr.split('T')[0];
                const isScheduled = schedule[dateOnly]?.some(entry => entry.reservationId === res.id);
                if (!isScheduled) {
                    items.push({ reservation: res, date: dateOnly });
                }
            });
        });
        return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
    }, [reservations, courses, schedule]);

    const upcomingCourses = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return courses
            .filter(course => !course.isIndividual)
            .map(course => {
                if (course.dates.length === 0) return null;
                const courseDates = course.dates.map(d => new Date(d));
                const earliestDate = new Date(Math.min(...courseDates.map(d => d.getTime()).filter(t => !isNaN(t))));
                 if (isNaN(earliestDate.getTime())) return null;
                return { ...course, earliestDate };
            })
            .filter((course): course is (Course & { earliestDate: Date }) => {
                return course !== null && course.earliestDate >= today;
            })
            .sort((a, b) => a.earliestDate.getTime() - b.earliestDate.getTime())
            .slice(0, 5);
    }, [courses]);

    return (
        <div className="content-page homepage">
            <h1>Strona Główna</h1>
            <p>Witaj w Osk Menager. Oto przegląd najważniejszych informacji.</p>

            <div className="stats-bar">
                <StatCard number={totalStudents} label="Aktywnych kursantów" />
                <StatCard number={totalCourses} label="Zdefiniowanych kursów" />
                <StatCard number={totalInstructors} label="Instruktorów" />
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <h2>Do zaplanowania</h2>
                    {unscheduledItems.length > 0 ? (
                        <ul className="dashboard-list">
                            {unscheduledItems.map(({ reservation, date }, index) => (
                                <li key={`${reservation.id}-${date}-${index}`} className="dashboard-list-item">
                                    <div className="item-primary">
                                        {reservation.student.name}
                                        <span className="sub-text">
                                            {reservation.customDates ? `Indywidualny - ${reservation.category}` : courses.find(c => c.id === reservation.courseId)?.name}
                                        </span>
                                    </div>
                                    <div className="item-secondary">{formatDate(date)}</div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="no-items-message">Brak pozycji do zaplanowania.</p>
                    )}
                </div>

                <div className="dashboard-card">
                    <h2>Najbliższe kursy</h2>
                     {upcomingCourses.length > 0 ? (
                        <ul className="dashboard-list">
                            {upcomingCourses.map(course => (
                                <li key={course.id} className="dashboard-list-item">
                                    <div className="item-primary">
                                        {course.name}
                                         <span className="sub-text" style={{color: course.color, fontWeight: 500}}>
                                            Start: {formatDate(course.earliestDate.toISOString())}
                                        </span>
                                    </div>
                                    <div className="item-secondary">
                                        Wolne miejsca: {course.slots}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="no-items-message">Brak nadchodzących kursów.</p>
                    )}
                </div>
            </div>
            
            <div className="dashboard-card finance-summary-card">
                <h2>Podsumowanie finansowe</h2>
                <div className="finance-details">
                    <div className="finance-item">
                        <div className="finance-label">Przewidywany przychód</div>
                        <div className="finance-value">{formatCurrency(financialSummary.totalRevenue)}</div>
                    </div>
                    <div className="finance-item">
                        <div className="finance-label">Wpłacone środki</div>
                        <div className="finance-value">{formatCurrency(financialSummary.totalPaid)}</div>
                    </div>
                     <div className="finance-item">
                        <div className="finance-label">Pozostało do zapłaty</div>
                        <div className="finance-value">{formatCurrency(financialSummary.totalOutstanding)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;