import React from 'react';
import type { Reservation, CoursePrices, CourseCategory } from './index.tsx';

interface FinancesPageProps {
    reservations: Reservation[];
    coursePrices: CoursePrices;
}

const FinancesPage = ({ reservations, coursePrices }: FinancesPageProps) => {

    const formatCurrency = (amount: number) => {
        return `${amount.toFixed(2)} zł`;
    };

    return (
        <div className="content-page finances-page">
            <h1>Finanse</h1>
            <p>Przeglądaj finanse, płatności i należności kursantów.</p>

             <div className="finances-card">
                <div className="finances-table-container">
                    <table className="finances-table">
                        <thead>
                            <tr>
                                <th>Kursant</th>
                                <th>Kategoria</th>
                                <th>Cena kursu</th>
                                <th>Wpłacona zaliczka</th>
                                <th>Do zapłaty</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reservations.length > 0 ? (
                                reservations.map(reservation => {
                                    const category = reservation.category || 'B';
                                    const price = coursePrices[category] || 0;
                                    const paidAmount = reservation.advancePaid ? reservation.advanceAmount : 0;
                                    const remainingAmount = price - paidAmount;
                                    const isPaid = remainingAmount <= 0;

                                    return (
                                        <tr key={reservation.id}>
                                            <td>{reservation.student.name}</td>
                                            <td>{category}</td>
                                            <td>{formatCurrency(price)}</td>
                                            <td>{formatCurrency(paidAmount)}</td>
                                            <td>{formatCurrency(Math.max(0, remainingAmount))}</td>
                                            <td>
                                                <span className={`status-badge ${isPaid ? 'status-paid' : 'status-unpaid'}`}>
                                                    {isPaid ? 'Opłacono' : 'Do zapłaty'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="no-results-message">
                                        Brak rezerwacji do wyświetlenia.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinancesPage;
