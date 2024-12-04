// Reserved Keywords | Operators \\
const reserved = ["const", "let"]

const symbols = {
    ["("]: "Paren",
    [")"]: "Paren",

    ["{"]: "Brace",
    ["}"]: "Brace",

    ["["]: "Bracket",
    ["]"]: "Bracket",

    ["."]: "Dot",
    [":"]: "Colon"

}

const operators = [
    // Arithmetic \\
    "+", "-",
    "*", "/",
    "^", "%",

    // Comparison \\
    ">", ">=",
    "<", "<=",
    "==", "!=", 

    "="
]

// Basic Character Functions \\
const isNewline = char => char == "\n" // Returns whether given character is a Newline -> \n
const isWhitespace = char => char == " " || char == "\r" // Returns whether given character is a Whitespace -> 
const isNumber = char => !isNaN(char - parseFloat(char)) // Returns whether given character is a Number
const isAlpha = char => char.toUpperCase() !== char.toLowerCase() // Returns whether given character is an Alphabetic (A !== a therfore it's an alpabetic)

const isReserved = token => reserved.includes(token) // Returns whether given token is a reserved Keyword
const isOperator = token => operators.includes(token) // Returns whether given token is a reserved Operator (+, -, >=, etc)

const getOperatorType = operator => {
    const index = operators.indexOf(operator)

    return (index >= 0 && index <= 5) ? "Arithmetic"
         : (index >= 6 && index <= 11) ? "Comparison"
         : (index == operators.length - 1) ? "Assignment" 
         : null
}

class Lexer {
    constructor(src){
        this.src = src
        this.length = src.length
        this.currentPos = -1
        this.linePos = 0
        this.currentLine = 1
        this.currentChar = null

        this.tokens = []

        this.start()
    }

    // Advances past current character, returning it and updating current character \\
    advance() {
        this.currentPos++
        this.linePos++

        const advancedPast = this.currentChar
        this.currentChar = this.src[this.currentPos]
        
        if (isNewline(this.currentChar)) {
            this.currentLine++
            this.linePos = 1
        }

        return advancedPast
    }

    // Looks up the next character and returns it. (Does not Advance!) \\
    peek(amount = 1) {
        return this.src[this.currentPos + amount]
    }

    // Read Methods \\
    readIdentifier() {
        let token = this.advance()

        while (this.currentChar && isAlpha(this.currentChar) || isNumber(this.currentChar) || this.currentChar == "_") {
            token += this.advance() + ""
        }

        // Check if formed token is our reserved keyword and then push it into your tokens \\
        if (isReserved(token)) {
            return this.tokens.push({
                type: "Keyword",
                value: token
            })
        }

        // Booleans and null's are also reserved, but they are not keywords, they are runtime values \\
        if (token == "true" || token == "false" || token == "null") {
            return this.tokens.push({
                type: (token == "true" || token == "false") ? "Bool"
                    : "Null",
                value: token
            })
        }

        // It's not a reserved token, that means it's an Identifier \\
        return this.tokens.push({
            type: "Identifier",
            value: token
        })
    }

    readOperator() {
        let token = this.advance()

        if (this.peek() && isOperator(token + this.currentChar)) {
            token += this.advance() // Form multi-char operator
        }

        return this.tokens.push({
            type: getOperatorType(token),
            value: token
        })
    }

    readString() {
        const expectedQoute = this.advance() // Save opening quotes, we will use this to match closing qoutes
        const stringBuffer = [] // String Buffer (Faster than string concatination)

        if (this.currentChar === undefined) {
            throw `Malformed string at line ${this.currentLine}`
        } 

        while (this.currentPos < this.length) {
            if (this.currentChar == expectedQoute) {
                const str = stringBuffer.join("")

                this.tokens.push({
                    type: "String",
                    value: str
                })

                this.advance()
                break
            }

            if (isNewline(this.currentChar) || this.peek() === undefined) {
                throw `Malformed string at line ${this.currentLine}`
            }

            stringBuffer.push(this.advance())
        }
    }

    readNumber() {
        const numberBuffer = []

        // Read Hex \\
        if (this.currentChar == "0" && this.peek() && this.peek().toLowerCase() == "x") {
            numberBuffer.push(this.advance())
            numberBuffer.push(this.advance())

            if (!isNumber(this.currentChar) && !isAlpha(this.currentChar)) {
                throw `Malformed number at line ${this.currentLine}`
            }

            while (this.currentChar) {
                if (isNumber(this.currentChar) || isAlpha(this.currentChar)) {
                    numberBuffer.push(this.advance())
                    continue
                }

                break
            }
        } else { // Reads Integer | Decimal number | Exponent
            while (this.currentChar) {
                let hasExponent = false
                let hasDecimal = false

                if (this.currentChar == "_") {
                    this.advance()
                    continue
                }

                if (isNumber(this.currentChar)) {
                    numberBuffer.push(this.advance())
                } else if (this.currentChar == "." && !hasDecimal) {
                    hasDecimal = true
                    numberBuffer.push(this.advance())
                } else if (this.currentChar.toLowerCase() == "e" && !hasExponent) {
                    hasExponent = true
                    numberBuffer.push(this.advance())

                    if (this.currentChar == "+" || this.currentChar == "-") {
                        numberBuffer.push(this.advance())
                    }
                } else {
                    break
                }
            }
        }

        const number = Number(numberBuffer.join(""))

        if (isNaN(number)) {
            throw `Malformed number at line ${this.currentLine}`
        }

        return this.tokens.push({
            type: "Number",
            value: number
        })
    }

    readComment() {
        this.advance() // Advance past first /
        const isLongComment = this.currentChar == "*"

        while (this.currentChar) {
            if (isLongComment) {
                if (this.currentChar == "*" && this.peek() == "/") {
                    this.advance()
                    this.advance()
                    break
                }
            } else {
                if (isNewline(this.currentChar)) {
                    break
                }
            }

            this.advance()
        }
    }

    start() {
        this.advance() // Initializes our starting character and position

        // Lex until the end of source \\
        while (this.currentPos < this.length) {
            // Skip Whitespaces or Newlines \\
            if (isWhitespace(this.currentChar) || isNewline(this.currentChar)) {
                this.advance()
                continue
            }

            // Check for Single Character Symbols \\
            if (symbols[this.currentChar]) {
                this.tokens.push({
                    type: symbols[this.currentChar],
                    value: this.currentChar
                })

                this.advance()
                continue
            }

            // Form Keyword | Bool | Null | Identifier \\
            if (isAlpha(this.currentChar) || this.currentChar == "_") {
                this.readIdentifier()
                continue
            }

            // Form Operators \\
            if (isOperator(this.currentChar) || this.currentChar == "!") {
                // Read Comment \\
                if (this.currentChar == "/" && this.peek() == "/" || this.peek() == "*") {
                    this.readComment()
                } else {
                    this.readOperator()
                }
                
                continue
            }

            // Form String \\
            if (this.currentChar == "'" || this.currentChar == '"') {
                this.readString()
                continue
            }

            // Form Number \\
            if (isNumber(this.currentChar)) {
                this.readNumber()
                continue
            }

            throw `Unrecognized character '${this.currentChar}' at line ${this.currentLine}`
        }
    }
}


// EXAMPLE USAGE \\

const code = `
// this is a comment
const greet = ("Hello World!")
const num = 0xFFF + 5
/*
multi line comment
*/
`

const lexer = new Lexer(code)
console.log(lexer.tokens)
