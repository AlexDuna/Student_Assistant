import React, {useRef, useEffect} from "react";

const QuizSection = ({
    quizType,
    quizData,
    quizAnswers,
    setQuizAnswers,
    submitQuiz,
    quizResults,
}) => {
    const quizRef = useRef(null);

    useEffect(() => {
        quizRef.current?.scrollIntoView({behavior : "smooth"});
    }, [quizData]);
    return(
        <div ref={quizRef} className="quiz-selection">
            <h3>
                Your ({quizType === "multiple_choice" ? "Multiple Choice" : "Open Ended"}) Quiz
            </h3>

            {quizData.map((item, index) => (
                <fieldset key={index} className="quiz-item quiz-fieldset">
                    <legend>
                        <strong>{index + 1}. {item.question}</strong>
                    </legend>

                    {quizType === "multiple_choice" ? (
                        item.options.map((opt, optIdx) => {
                            const inputId = `q${index}_opt${optIdx}`;
                            return(
                            <div key = {optIdx}>
                                <input 
                                    id={inputId}
                                    type = "radio"
                                    name = {`q${index}`}
                                    value = {opt}
                                    checked = {quizAnswers[index] === opt}
                                    onChange={() => {
                                        const newAnswers = [...quizAnswers];
                                        newAnswers[index] = opt;
                                        setQuizAnswers(newAnswers);
                                    }}
                                />
                                <label htmlFor={inputId}>{opt}</label>
                            </div>
                            );
                    })
                    ):(
                        <input 
                            type = "text"
                            value = {quizAnswers[index]}
                            onChange={(e) => {
                                const newAnswers = [...quizAnswers];
                                newAnswers[index] = e.target.value;
                                setQuizAnswers(newAnswers);
                            }}
                            placeholder="Your answer"
                        />
                    )}
                </fieldset>
            ))}

            <button onClick={submitQuiz}> Submit Quiz</button>

            {quizResults && (
                <div className="quiz-results">
                    <h4> Result: {quizResults.score}</h4>
                    {quizResults.results.map((r,i) => (
                        <div key={i} className={`quiz-feedback ${r.is_correct ? "correct" : "incorrect" }`}>
                            <p><strong>{i + 1}. {r.question}</strong></p>
                            <p>Your answer: <em>{r.your_answer}</em></p>
                            {!r.is_correct && <p>✔ RIGHT Answer: <strong>{r.correct_answer || "Unavailable"}</strong></p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuizSection;