# 异步与并发模式 — 跨语言通用指南

> 本文档覆盖并发模型对比、常见陷阱、跨语言最佳实践和结构化并发模式。
>
> **This project**: everything here is `async/await` over Node's event loop (services under `js/services/`, storage adapters under `js/storage/`, `server/` routes). The "async/await + Event Loop" row below is the relevant model; the Go/Rust/Kotlin/Swift/C# sections are included for completeness but don't apply to this codebase.

## 目录

- [并发模型对比](#并发模型对比)
- [常见陷阱](#常见陷阱)
- [最佳实践](#最佳实践)
- [跨语言代码示例](#跨语言代码示例)
- [Review Checklist](#review-checklist)

---

## 并发模型对比

| 模型 | 语言 | 核心概念 | 优点 | 缺点 |
|------|------|----------|------|------|
| **Goroutines + Channels** | Go | 轻量级协程 + CSP 通信 | 极简语法、低开销 | 手动取消传播 |
| **async/await + Event Loop** | Python, TypeScript/JavaScript | 单线程协作式多任务 | 无锁、易推理 | 不能阻塞事件循环 |
| **async/await + Tokio** | Rust | Futures + 运行时调度 | 零成本抽象、编译期安全 | 学习曲线陡 |
| **Coroutines + Flow** | Kotlin | 挂起函数 + 结构化并发 | 自动取消、生命周期绑定 | Dispatchers 选择复杂 |
| **async/await + Actors** | Swift | 结构化并发 + Actor 隔离 | 编译期数据竞争检查 | Swift 6 迁移成本 |
| **async/await + TPL** | C# | Task + 线程池 | 成熟生态、ConfigureAwait | 隐式线程切换 |
| **Threads + Mutexes** | C++, Java, 所有 | OS 线程 + 共享内存 | 真正并行 | 锁管理复杂、死锁风险 |

### 何时选择什么

```
I/O 密集型（网络、数据库、文件）:
  → async/await（Python, TS/JS, Rust, Swift, C#）
  → goroutines（Go）
  → coroutines（Kotlin）

CPU 密集型（计算、图像处理）:
  → 线程池（Java, C++, C#）
  → multiprocessing（Python）
  → Worker threads（Node.js）
  → spawn_blocking（Rust tokio）

混合型:
  → async + Worker threads（Node.js）
  → async + run_in_executor（Python）
```

---

## 常见陷阱

### 陷阱 1: 竞态条件（Race Condition）

多个并发任务读写共享状态，结果依赖执行顺序。

```
// 通用伪代码
counter = 0

task1: counter += 1   // 读 counter=0, 写 counter=1
task2: counter += 1   // 读 counter=0, 写 counter=1
// 期望 counter=2, 实际 counter=1
```

**解决方案**：互斥锁、原子操作、或将共享状态封装在 Actor 中。在 Node.js 单线程事件循环中，竞态通常发生在两个 `await` 之间——第一个 `await` 让出控制权后，另一个异步操作可能修改了同一份内存中的对象（例如同一个 `root` 对象被两次并发的 `_getRootData()` → 修改 → `_saveRootData()` 序列交错执行，后写入的会覆盖先写入的）。

```javascript
// ❌ 交错写入导致丢失更新
async function addPlayer(playerData) {
  const root = await this._getRootData();       // await #1: 让出线程
  root.teams.default.weeks[1].players.push(playerData);
  await this._saveRootData(root);                // await #2
}
// 如果 addPlayer() 被并发调用两次，两次都基于同一份旧 root 读取，
// 第二次保存会覆盖第一次的写入

// ✅ 序列化写操作（简单场景：一个 in-flight write 的 promise 队列）
class WriteQueue {
  constructor() { this._tail = Promise.resolve(); }
  enqueue(fn) {
    this._tail = this._tail.then(fn, fn);
    return this._tail;
  }
}
```

### 陷阱 2: 死锁（Deadlock）

两个或多个任务互相等待对方持有的锁。

```
task1: lock(A); lock(B);  // 持有 A，等待 B
task2: lock(B); lock(A);  // 持有 B，等待 A
// 两者永远等待
```

**解决方案**：
- 一致的锁获取顺序
- 超时锁（tryLock with timeout）
- 避免嵌套锁

### 陷阱 3: Starvation

低优先级任务永远得不到执行机会。

```
// 高优先级任务持续到达，低优先级任务永远排队
```

**解决方案**：公平锁、任务优先级队列、限制并发数。

### 陷阱 4: Promise / Task 泄漏

启动并发任务但没有确保其完成或被等待。

```javascript
// ❌ Fire-and-forget promise — errors are silently swallowed
function saveInBackground(data) {
  this._saveRootData(data);  // not awaited, not returned, not caught
}

// ✅ Either await it, return it, or explicitly handle rejection
async function saveInBackground(data) {
  try {
    await this._saveRootData(data);
  } catch (error) {
    handleAppError(error);
  }
}
```

```python
# ❌ Python: Task 泄漏
async def process():
    task = asyncio.create_task(long_running())
    # 函数返回，但 task 仍在运行
```

**解决方案**：确保每个 Promise 都被 `await`、`return`，或至少附加 `.catch()`；使用 `Promise.allSettled` 跟踪一组后台任务的完成情况。

### 陷阱 5: 在异步上下文中阻塞

```javascript
// ❌ Node.js: synchronous fs call blocks the entire event loop
function loadConfigSync() {
  return JSON.parse(fs.readFileSync('config.json', 'utf-8'));
}

// ✅ Use the async fs API
async function loadConfig() {
  const raw = await fs.promises.readFile('config.json', 'utf-8');
  return JSON.parse(raw);
}
```

```python
# ❌ Python: 在 async 函数中使用同步 I/O 阻塞事件循环
async def handle():
    result = requests.get(url)  # 阻塞！整个事件循环停滞
    return result

# ✅ 使用异步 I/O 或将阻塞操作放到线程池
async def handle():
    result = await aiohttp.get(url)  # 非阻塞
    return result
```

---

## 最佳实践

### 1. 结构化并发

确保并发任务的生命周期与创建它们的 scope 绑定。父任务取消时，子任务自动取消。

```javascript
// ✅ JavaScript: group related async work so failures/completion are observed together
async function syncAllTeams(teamIds) {
  const results = await Promise.allSettled(
    teamIds.map((id) => syncTeam(id))
  );
  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    handleAppError(new AggregateError(failures.map((f) => f.reason)));
  }
}
```

```python
# ✅ Python 3.11+: TaskGroup
async def process_items():
    async with asyncio.TaskGroup() as tg:
        for item in items:
            tg.create_task(process_item(item))
    # TaskGroup 退出时等待所有任务完成
    # 如果一个任务失败，其余任务自动取消
```

### 2. 取消传播

确保取消信号能正确传播到所有子任务。

```javascript
// ✅ JavaScript: AbortController for cancellable fetch
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
```

### 3. Backpressure（反压）

当生产者速度远超消费者时，需要限制队列大小，防止内存膨胀。

```javascript
// ✅ JavaScript: bounded queue — reject/drop when full rather than growing unbounded
class BoundedQueue {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.items = [];
  }
  push(item) {
    if (this.items.length >= this.maxSize) {
      throw new Error('queue full');
    }
    this.items.push(item);
  }
}
```

### 4. 限制并发数

防止同时启动过多任务导致资源耗尽。

```javascript
// ✅ JavaScript: simple concurrency-limited map (no external deps)
async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}
```

```python
# ✅ Python: Semaphore 限制并发
async def fetch_all(urls: list[str], max_concurrent: int = 10):
    semaphore = asyncio.Semaphore(max_concurrent)

    async def fetch_one(url: str):
        async with semaphore:
            return await aiohttp.get(url)

    return await asyncio.gather(*[fetch_one(url) for url in urls])
```

---

## 跨语言代码示例

### JavaScript / TypeScript: Worker-pool 并发限制

```typescript
// ✅ Worker-pool pattern: 固定数量 worker 竞争任务队列
//    结果按原始索引赋值，保证输出顺序与输入一致。
async function processWithLimit<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    limit: number,
): Promise<R[]> {
    const results: R[] = [];
    let index = 0;

    const workers = Array.from({ length: limit }, async () => {
        while (index < items.length) {
            const i = index++;
            results[i] = await fn(items[i]);
        }
    });

    await Promise.all(workers);
    return results;
}
```

### Go: Goroutines + Channels + Context

```go
// ✅ 完整模式: context 取消 + errgroup + 有界并发
func processBatch(ctx context.Context, items []Item) ([]Result, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]Result, len(items))
    sem := make(chan struct{}, 10)  // 最多 10 个并发

    for i, item := range items {
        i, item := i, item
        g.Go(func() error {
            select {
            case sem <- struct{}{}:
            case <-ctx.Done():
                return ctx.Err()
            }
            defer func() { <-sem }()

            result, err := process(ctx, item)
            if err != nil {
                return fmt.Errorf("item %d: %w", i, err)
            }
            results[i] = result
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### Python: asyncio + TaskGroup

```python
# ✅ Python 3.11+: 结构化并发 + 有界并发 + 超时
import asyncio

async def process_batch(items: list[Item], max_concurrent: int = 10) -> list[Result]:
    semaphore = asyncio.Semaphore(max_concurrent)

    async def process_one(item: Item) -> Result:
        async with semaphore:
            return await process(item)

    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(process_one(item)) for item in items]

    return [task.result() for task in tasks]
```

---

## Review Checklist

### 基本检查
- [ ] 并发任务有明确的退出机制（不会泄漏，Promise 不是 fire-and-forget）
- [ ] 共享状态有适当保护（在 JS 中：避免两个 `await` 之间的交错写操作破坏同一份数据）
- [ ] 没有在异步上下文中执行阻塞操作（同步 `fs.*Sync`、CPU 密集循环）
- [ ] 取消信号正确传播到所有子任务（`AbortController`/`AbortSignal`）

### 架构检查
- [ ] 使用结构化并发（`Promise.all`/`Promise.allSettled` 而非零散的 fire-and-forget）
- [ ] 并发数有上限（避免同时发起无限数量的请求/写操作）
- [ ] 长时间运行的任务支持超时
- [ ] 背压机制防止内存膨胀

### 性能检查
- [ ] 并发粒度合理（不过细也不过粗）
- [ ] I/O 密集使用 async，CPU 密集考虑 Worker threads
- [ ] 没有不必要的顺序 `await`（可并行的操作串行执行）

```javascript
// ❌ 顺序 await——两个独立请求不必等待彼此
const a = await fetchA();
const b = await fetchB();

// ✅ 并发
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

### 语言特定（JavaScript/Node.js）
- [ ] 每个 `async` 函数调用点都有对应的 `await`/`.then()`/`.catch()`
- [ ] 没有裸露的 fire-and-forget promise（未 `await`、未 `return`、未附加 `.catch()`）
- [ ] `Promise.all` 用于独立操作；`Promise.allSettled` 用于希望收集所有结果（含失败）的场景
- [ ] 定时器/间隔器（`setInterval`/`setTimeout`）在不再需要时被清理
