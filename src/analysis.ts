const Countable = require('countable');

// pattern regex
const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;

export interface AnalysisResult
{
    words: number;
    characters: number;
    hasUrl: boolean;
    hasEmail: boolean;
}

export function analyzeText(text: string): Promise<AnalysisResult>
{
    return new Promise((resolve) => {
        Countable.count(text, (counter: { words: number; all: number;}) =>
        {
            resolve(
                {
                    words: counter.words,
                    characters: counter.all,
                    hasUrl: urlRegex.test(text),
                    hasEmail: emailRegex.test(text)
                }
            );
        }
        );
    });
}