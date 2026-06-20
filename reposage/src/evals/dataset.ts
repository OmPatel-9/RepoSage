/**
 * Golden evaluation dataset for RepoSage.
 *
 * Three real-world repos × 10 questions each = 30 eval cases.
 *
 * expectedFiles  – paths (relative to repo root) that a correct answer MUST
 *                  cite. Computed as recall against chunk filePaths in the DB.
 *                  Paths are accurate as of the repos' main branches in mid-2025;
 *                  if a repo refactors, update the paths here.
 *
 * idealAnswer    – 2-3 sentence rubric used by the LLM judge (not exact text).
 *                  Describes what a 5/5 answer contains.
 */

export interface EvalCase {
  id: string
  repo: string // GitHub URL
  question: string
  expectedFiles: string[] // paths the answer SHOULD cite
  idealAnswer: string // rubric for the LLM judge
}

// ---------------------------------------------------------------------------
// Repo 1 — sindresorhus/is
// Small Node.js library (~pure TypeScript). Tests type-predicate internals.
// ---------------------------------------------------------------------------
const IS_CASES: EvalCase[] = [
  {
    id: 'is-01',
    repo: 'https://github.com/sindresorhus/is',
    question: 'How does `is.string()` determine whether a value is a string?',
    expectedFiles: ['source/index.ts'],
    idealAnswer:
      'The answer should explain that `is.string` uses `typeof value === "string"` as its predicate and is exported as part of the `is` namespace object. It should cite the predicate definition from source/index.ts and mention the TypeScript return type `value is string`.',
  },
  {
    id: 'is-02',
    repo: 'https://github.com/sindresorhus/is',
    question:
      'What is the difference between `is.array` and `is.arrayLike`? Give examples of values that match one but not the other.',
    expectedFiles: ['source/index.ts'],
    idealAnswer:
      '`is.array` uses `Array.isArray` and only matches true arrays. `is.arrayLike` also accepts objects with a numeric `.length` property such as `arguments`, `NodeList`, and typed arrays. The answer should cite both predicate implementations and give concrete examples.',
  },
  {
    id: 'is-03',
    repo: 'https://github.com/sindresorhus/is',
    question:
      'How do `is.any()` and `is.all()` work, and how are they different?',
    expectedFiles: ['source/index.ts'],
    idealAnswer:
      '`is.any(predicates, value)` returns true if at least one predicate matches, while `is.all(predicates, value)` requires every predicate to match. The answer should show the iteration logic for each (some vs every) and cite the implementation lines in source/index.ts.',
  },
  {
    id: 'is-04',
    repo: 'https://github.com/sindresorhus/is',
    question:
      'What TypeScript assertion functions does the library export, and how does `assert.string` differ from `is.string`?',
    expectedFiles: ['source/index.ts', 'source/types.ts'],
    idealAnswer:
      'The library exports an `assert` namespace where each function calls the corresponding `is.*` predicate and throws `AssertionTypeError` on failure. `is.string` returns a boolean; `assert.string` throws if false. The answer should reference `AssertionTypeError` and the `assert` namespace construction.',
  },
  {
    id: 'is-05',
    repo: 'https://github.com/sindresorhus/is',
    question:
      'What is `AssertionTypeError` and in what situations is it thrown?',
    expectedFiles: ['source/index.ts'],
    idealAnswer:
      'AssertionTypeError is the custom error class thrown when an assertion (assert.string, assert.number, etc.) fails — i.e. when the value does not match the expected type. The answer should show its class definition, the message format, and where it is thrown inside the assert wrapper.',
  },
  {
    id: 'is-06',
    repo: 'https://github.com/sindresorhus/is',
    question:
      'How is the main `is` object assembled — is it a class, a plain object, or something else?',
    expectedFiles: ['source/index.ts'],
    idealAnswer:
      'The `is` export is a plain function (checking for undefined/null) that also has named properties assigned to it, making it both callable and a namespace. The answer should show how properties like `is.string`, `is.number`, etc. are assigned and explain that it is not a class instance.',
  },
  {
    id: 'is-07',
    repo: 'https://github.com/sindresorhus/is',
    question: 'How does `is.nodeStream()` detect a Node.js stream?',
    expectedFiles: ['source/index.ts'],
    idealAnswer:
      'The answer should show the predicate checks for object type, the presence of a `.pipe` method (for readable), and optionally `.write` (for writable) or `.read`. It should cite the exact implementation from source/index.ts.',
  },
  {
    id: 'is-08',
    repo: 'https://github.com/sindresorhus/is',
    question: 'What is the `TypeName` type and which values does it enumerate?',
    expectedFiles: ['source/types.ts', 'source/index.ts'],
    idealAnswer:
      'TypeName is a string union type that lists all the type names returned by `is(value)` when called directly (e.g., "string", "number", "null", "undefined", "Array", "Function", etc.). The answer should enumerate the variants and cite the type definition in source/types.ts.',
  },
  {
    id: 'is-09',
    repo: 'https://github.com/sindresorhus/is',
    question:
      'How does the library implement browser-environment checks such as `is.htmlElement` or `is.domElement`?',
    expectedFiles: ['source/index.ts'],
    idealAnswer:
      'Browser-specific checks use `instanceof` with DOM globals (HTMLElement, Element, etc.) guarded by a check that the global exists (to avoid crashes in Node). The answer should cite the predicate and explain the guard pattern.',
  },
  {
    id: 'is-10',
    repo: 'https://github.com/sindresorhus/is',
    question:
      'How does the `is` function behave when called directly as `is(value)` rather than through a named predicate like `is.string(value)`?',
    expectedFiles: ['source/index.ts', 'source/types.ts'],
    idealAnswer:
      'Calling `is(value)` directly returns a `TypeName` string (e.g., "string", "null", "Array") using `Object.prototype.toString` or similar discrimination. The answer should cite the implementation and explain it is distinct from the boolean predicates.',
  },
]

// ---------------------------------------------------------------------------
// Repo 2 — colinhacks/zod
// Medium TypeScript library. Tests schema-construction internals.
// ---------------------------------------------------------------------------
const ZOD_CASES: EvalCase[] = [
  {
    id: 'zod-01',
    repo: 'https://github.com/colinhacks/zod',
    question:
      'How does `z.string().email()` validate an email address internally?',
    expectedFiles: ['src/types.ts'],
    idealAnswer:
      'The answer should explain that `.email()` adds a check to the ZodString checks array using a regex or email-validation function, and that all checks are run in sequence during `_parse`. It should cite the check entry structure and where the email regex is defined.',
  },
  {
    id: 'zod-02',
    repo: 'https://github.com/colinhacks/zod',
    question:
      'What is the difference between `.parse()` and `.safeParse()` in terms of implementation?',
    expectedFiles: ['src/types.ts'],
    idealAnswer:
      'Both call `_parse` internally. `.parse()` throws a ZodError if the result is not OK; `.safeParse()` wraps the result in `{ success: true, data }` or `{ success: false, error }`. The answer should cite both method bodies from ZodType and show the branching logic.',
  },
  {
    id: 'zod-03',
    repo: 'https://github.com/colinhacks/zod',
    question: 'What is `ZodError` and how are issues structured within it?',
    expectedFiles: ['src/ZodError.ts'],
    idealAnswer:
      'ZodError extends Error and holds an `issues` array of `ZodIssue` objects. Each issue has a `code`, `path`, and `message`, and may have additional fields depending on the issue type (e.g., `expected`/`received` for invalid_type). The answer should cite the ZodIssue union from ZodError.ts.',
  },
  {
    id: 'zod-04',
    repo: 'https://github.com/colinhacks/zod',
    question:
      'How does ZodObject implement `.partial()` to make all keys optional?',
    expectedFiles: ['src/types.ts'],
    idealAnswer:
      'ZodObject.partial() maps over `shape` and wraps each schema value in `z.optional()`, returning a new ZodObject with the updated shape. The answer should show the shape transformation and how optionality is represented in the parsed output type.',
  },
  {
    id: 'zod-05',
    repo: 'https://github.com/colinhacks/zod',
    question:
      'How does `.transform()` create a new schema type and pipe the output?',
    expectedFiles: ['src/types.ts'],
    idealAnswer:
      'Calling `.transform(fn)` creates a `ZodEffects` schema that wraps the original schema. During parsing, the inner schema is parsed first, then `fn` is applied to the result. The answer should show ZodEffects and how it chains `_parse` through the transform function.',
  },
  {
    id: 'zod-06',
    repo: 'https://github.com/colinhacks/zod',
    question:
      'How are discriminated unions implemented in Zod (`z.discriminatedUnion`)?',
    expectedFiles: ['src/types.ts'],
    idealAnswer:
      'ZodDiscriminatedUnion builds a map from the discriminant key values to their schemas at construction time, allowing O(1) lookup during parsing instead of trying each branch. The answer should show the options map, the discriminant value extraction, and how it avoids trying all schemas.',
  },
  {
    id: 'zod-07',
    repo: 'https://github.com/colinhacks/zod',
    question:
      'What is the `ZodType` base class and what abstract method must every schema implement?',
    expectedFiles: ['src/types.ts'],
    idealAnswer:
      'ZodType is the abstract base for all Zod schemas. Every subclass must implement `_parse(input: ParseInput): ParseReturnType<Output>`. The answer should describe the class signature, its generic type parameters (Output, Def, Input), and the parse context passed to `_parse`.',
  },
  {
    id: 'zod-08',
    repo: 'https://github.com/colinhacks/zod',
    question: 'How does `.refine()` work and how is its error surfaced?',
    expectedFiles: ['src/types.ts'],
    idealAnswer:
      'Calling `.refine(fn, message)` wraps the schema in a ZodEffects that runs `fn` on the parsed value and adds a `custom` ZodIssue if it returns false. The answer should cite where the refinement function is called and how failures are added to the issue list.',
  },
  {
    id: 'zod-09',
    repo: 'https://github.com/colinhacks/zod',
    question:
      'How does `.default()` work — does it affect parsing or only TypeScript types?',
    expectedFiles: ['src/types.ts'],
    idealAnswer:
      'ZodDefault wraps a schema and substitutes the default value when the input is `undefined` at parse time, not just at the TypeScript level. The answer should show the `_parse` override that checks for `undefined` and substitutes the default, and explain that it creates a new schema (ZodDefault).',
  },
  {
    id: 'zod-10',
    repo: 'https://github.com/colinhacks/zod',
    question:
      'How does Zod handle async validation — what is `parseAsync` and when is it needed?',
    expectedFiles: ['src/types.ts'],
    idealAnswer:
      'parseAsync runs `_parseAsync` which returns a Promise, necessary when refinements or transforms are async. The synchronous path (`_parse`) cannot handle async effects and will throw if an async result is returned. The answer should compare the sync and async paths and show where async detection happens.',
  },
]

// ---------------------------------------------------------------------------
// Repo 3 — pallets/flask
// Python web framework. Tests internals of routing, contexts, and blueprints.
// ---------------------------------------------------------------------------
const FLASK_CASES: EvalCase[] = [
  {
    id: 'flask-01',
    repo: 'https://github.com/pallets/flask',
    question:
      'How does the Flask application context work, and when is it pushed and popped?',
    expectedFiles: ['src/flask/ctx.py', 'src/flask/globals.py'],
    idealAnswer:
      'The application context (AppContext) is a context manager that pushes `current_app` and `g` onto a stack on entry and pops them on exit. It is pushed automatically when handling a request and can be pushed manually with `app.app_context()`. The answer should cite AppContext.__enter__/__exit__ and the _cv_app ContextVar.',
  },
  {
    id: 'flask-02',
    repo: 'https://github.com/pallets/flask',
    question:
      'How does Flask register URL routes internally — walk through what happens when `@app.route()` is used?',
    expectedFiles: ['src/flask/sansio/app.py', 'src/flask/app.py'],
    idealAnswer:
      'The `@app.route()` decorator calls `add_url_rule`, which registers the endpoint on the Werkzeug `url_map`. The view function is stored in `view_functions`. The answer should trace the decorator → add_url_rule → url_map.add flow and mention endpoint naming.',
  },
  {
    id: 'flask-03',
    repo: 'https://github.com/pallets/flask',
    question:
      'What is a Blueprint and how does registering one onto the app differ from defining routes directly on the app?',
    expectedFiles: [
      'src/flask/blueprints.py',
      'src/flask/sansio/blueprints.py',
    ],
    idealAnswer:
      'A Blueprint records deferred registrations (routes, error handlers, before/after request hooks) that are applied to the app when `app.register_blueprint()` is called. The answer should explain the deferred-registration pattern, the url_prefix/name namespace, and contrast it with direct app.route() calls.',
  },
  {
    id: 'flask-04',
    repo: 'https://github.com/pallets/flask',
    question:
      'How does Flask manage sessions — how is the session cookie created, read, and written?',
    expectedFiles: ['src/flask/sessions.py'],
    idealAnswer:
      'Flask uses a SecureCookieSessionInterface that signs session data with itsdangerous. `open_session` deserializes the cookie on request; `save_session` serializes and sets it on the response. The answer should cite the open_session and save_session methods and mention the secret_key requirement.',
  },
  {
    id: 'flask-05',
    repo: 'https://github.com/pallets/flask',
    question: 'How does `url_for()` work internally to build URLs?',
    expectedFiles: ['src/flask/helpers.py'],
    idealAnswer:
      "url_for calls `current_app.url_map.bind(request.host_url).build(endpoint, values)` via Werkzeug's URL adapter. It looks up the endpoint name in the url_map and fills in route variables. The answer should trace the call chain, mention how it resolves endpoints within blueprints, and cite the implementation.",
  },
  {
    id: 'flask-06',
    repo: 'https://github.com/pallets/flask',
    question: 'How does Flask integrate with Jinja2 for rendering templates?',
    expectedFiles: ['src/flask/templating.py', 'src/flask/app.py'],
    idealAnswer:
      'Flask creates a Jinja2 Environment in `create_jinja_environment` with a loader that searches template folders (app + blueprints). `render_template` calls `get_template` on the environment and passes the app context as template globals (g, request, session, url_for). The answer should cite both file paths and the environment setup.',
  },
  {
    id: 'flask-07',
    repo: 'https://github.com/pallets/flask',
    question:
      'What CLI commands does Flask expose and how does the `flask run` command start the dev server?',
    expectedFiles: ['src/flask/cli.py'],
    idealAnswer:
      "Flask exposes commands through Click groups: `run`, `shell`, `routes`, and `db` (if extensions add it). `flask run` calls Werkzeug's `run_simple` with the debugger and reloader configured from env vars and CLI options. The answer should cite the run_command function and show the run_simple call.",
  },
  {
    id: 'flask-08',
    repo: 'https://github.com/pallets/flask',
    question:
      'How does Flask dispatch an incoming request to the right view function?',
    expectedFiles: ['src/flask/app.py'],
    idealAnswer:
      "Flask's `full_dispatch_request` calls `dispatch_request`, which uses `url_map.match()` to resolve the endpoint and calls the matching view function from `view_functions`. Before/after request hooks and error handlers wrap this call. The answer should trace the WSGI entry point → wsgi_app → full_dispatch_request → dispatch_request flow.",
  },
  {
    id: 'flask-09',
    repo: 'https://github.com/pallets/flask',
    question:
      'What is the `g` object in Flask, how does it differ from `current_app`, and when is it reset?',
    expectedFiles: ['src/flask/globals.py', 'src/flask/ctx.py'],
    idealAnswer:
      '`g` is a request-scoped namespace (reset per request) while `current_app` is the application-scoped proxy (lives for the app context lifetime). `g` is stored on the request context and cleared when the request context is popped. The answer should reference the ContextVar-based proxies from globals.py and the context lifecycle in ctx.py.',
  },
  {
    id: 'flask-10',
    repo: 'https://github.com/pallets/flask',
    question:
      "How does Flask's built-in test client work — how does it simulate HTTP requests without a running server?",
    expectedFiles: ['src/flask/testing.py'],
    idealAnswer:
      "FlaskClient extends Werkzeug's Client and calls the WSGI app callable directly, bypassing the network layer. It also pushes an application context so request globals are available inside tests. The answer should cite FlaskClient.__init__ and how it wraps the app, plus how session_transaction works for inspecting session state.",
  },
]

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const EVAL_CASES: EvalCase[] = [
  ...IS_CASES,
  ...ZOD_CASES,
  ...FLASK_CASES,
]

/** Unique repos referenced in the dataset. */
export const EVAL_REPOS = [...new Set(EVAL_CASES.map((c) => c.repo))]
