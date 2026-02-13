package main

import (
	"bytes"
	"syscall/js"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

func main() {
	keepAlive := make(chan struct{})

	js.Global().Set("runGoCode", js.FuncOf(runGoCode))

	println("Go WASM Interpreter initialized")

	<-keepAlive
}

func runGoCode(this js.Value, args []js.Value) interface{} {
	code := args[0].String()

	var stdout bytes.Buffer
	var stderr bytes.Buffer

	i := interp.New(interp.Options{
		Stdout: &stdout,
		Stderr: &stderr,
	})

	if err := i.Use(stdlib.Symbols); err != nil {
		return "Error loading standard library: " + err.Error()
	}

	_, err := i.Eval(code)

	output := stdout.String()

	if stderr.Len() > 0 {
		output += "\n--- STDERR ---\n" + stderr.String()
	}

	if err != nil {
		output += "\n--- ERROR ---\n" + err.Error()
	}

	return output
}

