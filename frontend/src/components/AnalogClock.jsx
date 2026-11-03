
import React, { useState, useEffect } from 'react';
import { DEFAULT_TIMEZONE } from '../utils/dateUtils';
import "../css/AnalogClock.css";

const getClockTime = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: DEFAULT_TIMEZONE,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    }).formatToParts(new Date());

    const getValue = (type) =>
        Number(parts.find(part => part.type === type)?.value || 0);

    return {
        hours: getValue('hour') % 12,
        minutes: getValue('minute'),
        seconds: getValue('second')
    };
};

export default function AnalogClock() {
    const [time, setTime] = useState(getClockTime);

    useEffect(() => {
        const updateClock = () => setTime(getClockTime());

        updateClock();

        const interval = setInterval(updateClock, 1000);

        return () => clearInterval(interval);
    }, []);

    const { hours, minutes, seconds } = time;

    const hourAngle = hours * 30 + minutes * 0.5;
    const minuteAngle = minutes * 6 + seconds * 0.1;
    const secondAngle = seconds * 6;

    return (
        <div className="clock-container">
            <div className="clock">

                {/* Clock numbers */}
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="clock-number"
                        style={{
                            transform: `rotate(${i * 30}deg)`
                        }}
                    >
                        <span>{i === 0 ? 12 : i}</span>
                    </div>
                ))}

                {/* Clock hands */}
                <div
                    className="clock-hand hour-hand"
                    style={{ transform: `rotate(${hourAngle}deg)` }}
                />

                <div
                    className="clock-hand minute-hand"
                    style={{ transform: `rotate(${minuteAngle}deg)` }}
                />

                <div
                    className="clock-hand second-hand"
                    style={{ transform: `rotate(${secondAngle}deg)` }}
                />

                <div className="clock-center" />

            </div>
        </div>
    );
}
