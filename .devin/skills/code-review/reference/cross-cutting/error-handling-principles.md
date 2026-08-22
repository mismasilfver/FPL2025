# 错误处理原则 — 跨语言通用指南

> 本文档覆盖错误处理的核心原则、常见反模式、错误层次设计和日志最佳实践。每个原则附带跨语言代码示例。
>
> **This project**: `js/utils/app-error.js` (`AppError`) and `js/utils/error-handler.js` (`handleAppError`) already implement the "specific error types" and "single global handler" principles below. When reviewing new error-handling code, prefer extending `AppError` with a descriptive `code`/`context` over throwing generic `Error`, and route uncaught errors through `handleAppError` rather than a new ad-hoc `console.error`.

## 目录

- [核心原则](#核心原则)
- [反模式](#反模式)
- [错误层次设计](#错误层次设计)
- [日志最佳实践](#日志最佳实践)
- [跨语言代码示例](#跨语言代码示例)
- [Review Checklist](#review-checklist)

---

## 核心原则

### 原则 1: 不要吞掉错误

每个错误都必须被处理：向上传播、记录日志、或转换为更有意义的错误。**永远不要**静默忽略。

```
// 伪代码
result = risky_operation()
if error:
    // 必须做以下之一：
    //   1. return error to caller（传播）
    //   2. log + return fallback（降级）
    //   3. panic/crash（不可恢复时）
```

### 原则 2: 添加上下文

错误信息应包含**操作描述**和**关键参数**，使调试者无需阅读调用链即可定位问题。

```
// ❌ 无上下文
"failed"

// ✅ 有上下文
"failed to process order #12345: payment gateway timeout after 30s"
```

### 原则 3: 使用特定类型

用错误类型区分失败原因，让调用者能精确处理不同的失败场景。

```
// ❌ 通用错误
throw new Error("something went wrong")

// ✅ 特定类型
throw new OrderNotFoundError(orderId)
throw new PaymentTimeoutException(gatewayName, timeoutMs)
```

### 原则 4: Fail Fast

在操作开始前验证前置条件，尽早失败。这避免了部分执行后才发现错误导致的不一致状态。

```
// ❌ 执行到一半才发现参数无效
def process(data, config):
    result = expensive_computation(data)  # 已花费 5 秒
    if not config.valid:
        raise ValueError("invalid config")  # 5 秒白费了

// ✅ 先验证
def process(data, config):
    if not config.valid:
        raise ValueError("invalid config")
    result = expensive_computation(data)
```

### 原则 5: 错误处理只做一次

不要在每个层级都处理同一个错误（既 log 又 return 又 wrap）。选择一种方式，让调用者决定如何处理。

```
// ❌ 既 log 又 return（重复处理）
if err:
    log.error("failed: %s", err)
    return err

// ✅ 只包装并返回，让顶层统一处理
if err:
    return wrap_error("operation failed", err)
```

---

## 反模式

### 反模式 1: 空 catch 块

```python
# ❌ Python: 空 except 吞掉所有异常（包括 KeyboardInterrupt）
try:
    result = risky()
except:
    pass

# ❌ Java: 空 catch 吞掉异常
try {
    result = risky();
} catch (Exception e) {
    // 什么都不做
}

# ❌ Go: 忽略 error
result, _ := risky()

# ❌ Rust: unwrap() 在生产代码中
let result = risky().unwrap();  // panic on error
```

```javascript
// ❌ JavaScript: empty catch swallows the error
try {
  risky();
} catch (e) {
  // nothing
}

// ❌ Unhandled promise rejection (missing catch/try around await)
async function process() {
  const result = await risky();  // if risky() rejects, unhandled
}
```

### 反模式 2: 过宽的 catch

```python
# ❌ 捕获所有异常，无法区分失败类型
try:
    result = risky()
except Exception as e:
    logger.error(f"failed: {e}")

# ✅ 捕获特定异常
try:
    result = risky()
except ConnectionError as e:
    logger.warning(f"network issue, retrying: {e}")
    result = retry(risky)
except ValueError as e:
    logger.error(f"bad input: {e}")
    raise
```

### 反模式 3: 丢失原始异常

```python
# ❌ 丢失了原始异常的堆栈和信息
try:
    result = external_api.call()
except APIError as e:
    raise RuntimeError("API failed")  # 丢失了原因

# ✅ 保留异常链
try:
    result = external_api.call()
except APIError as e:
    raise RuntimeError("API failed") from e
```

```java
// ❌ 丢失原始异常
catch (IOException e) {
    throw new ServiceException("IO failed");
}

// ✅ 保留原因
catch (IOException e) {
    throw new ServiceException("IO failed", e);
}
```

```javascript
// ❌ JavaScript: dropping the original error
try {
  await risky();
} catch (e) {
  throw new Error('operation failed');  // e is lost
}

// ✅ Attach the original error as `cause` (ES2022+)
try {
  await risky();
} catch (e) {
  throw new Error('operation failed', { cause: e });
}
```

### 反模式 4: 用异常做流程控制

```python
# ❌ 异常做正常流程控制（慢且不清晰）
try:
    user = users[name]
except KeyError:
    user = create_default_user(name)

# ✅ 显式检查
user = users.get(name) or create_default_user(name)
```

```go
// ❌ Go: panic 做流程控制
func getUser(id int) User {
    if id <= 0 {
        panic("invalid id")
    }
}

// ✅ Go: 返回 error
func getUser(id int) (User, error) {
    if id <= 0 {
        return User{}, fmt.Errorf("invalid user id: %d", id)
    }
}
```

### 反模式 5: 忽略返回值

```csharp
// ❌ 忽略返回的 bool/Result
dict.TryGetValue("key", out var value);
// value 可能是默认值，但代码继续执行如同成功

// ✅ 检查返回值
if (!dict.TryGetValue("key", out var value))
{
    throw new KeyNotFoundException("key not found");
}
```

---

## 错误层次设计

### 三层错误架构

```
┌─────────────────────────────────────────────────┐
│ Application Errors（应用级）                      │
│   - AppError / ServiceError                      │
│   - 全局异常处理器捕获，返回用户友好的响应          │
├─────────────────────────────────────────────────┤
│ Module Errors（模块级）                            │
│   - PaymentError, AuthError, ValidationError     │
│   - 每个业务模块定义自己的错误类型                  │
├─────────────────────────────────────────────────┤
│ Infrastructure Errors（基础设施级）                │
│   - IOError, NetworkError, DatabaseError         │
│   - 来自操作系统、网络、数据库的底层错误            │
└─────────────────────────────────────────────────┘
```

### 设计规则

1. **模块级错误继承自应用级基类**，便于全局 catch
2. **基础设施错误在模块边界转换为模块级错误**，不暴露给上层
3. **每个错误类型包含足够的上下文**用于调试（ID、时间戳、操作名称）

### 示例层次（Python）

```python
class AppError(Exception):
    """应用基础异常"""
    pass

class PaymentError(AppError):
    """支付模块错误"""
    def __init__(self, order_id: str, reason: str):
        self.order_id = order_id
        super().__init__(f"payment failed for order {order_id}: {reason}")

class PaymentGatewayTimeout(PaymentError):
    """支付网关超时"""
    def __init__(self, order_id: str, gateway: str, timeout_ms: int):
        self.gateway = gateway
        self.timeout_ms = timeout_ms
        super().__init__(order_id, f"gateway {gateway} timed out after {timeout_ms}ms")
```

### 示例层次（JavaScript — matches this project's `AppError`）

```javascript
// ✅ Application-level base class with code + context, mirrors js/utils/app-error.js
class AppError extends Error {
  constructor(message, { code, recoverable = false, context = {} } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.recoverable = recoverable;
    this.context = context;
  }
}

// ✅ Module-level error extends AppError
class StorageInitFailure extends AppError {
  constructor(originalError) {
    super('Failed to initialize storage service', {
      code: 'STORAGE_INIT_FAILURE',
      context: { originalError },
    });
  }
}
```

---

## 日志最佳实践

### 日志级别选择

| 级别 | 何时使用 | 示例 |
|------|---------|------|
| **ERROR** | 需要人工介入的故障 | 支付失败、数据不一致 |
| **WARN** | 可自动恢复的异常 | 重试成功、降级处理 |
| **INFO** | 正常业务事件 | 订单创建、用户登录 |
| **DEBUG** | 调试信息 | 函数参数、中间状态 |

### 日志格式

```
// ❌ 无结构化信息
log.error("failed to process")

// ✅ 结构化信息 + 上下文
log.error("payment_failed", {
    "order_id": "12345",
    "gateway": "stripe",
    "error_code": "card_declined",
    "amount": 99.99,
    "duration_ms": 2340
})
```

### 日志安全

- **不要记录敏感信息**：密码、token、PII、完整信用卡号
- **脱敏处理**：`email: a***@example.com`
- **日志注入防护**：对用户输入做转义，防止伪造日志行

---

## 跨语言代码示例

### JavaScript / Node.js

```javascript
// ✅ Specific error class + context + cause chain
class PaymentError extends Error {
    constructor(message, { orderId, gateway, cause } = {}) {
        super(message, { cause });
        this.name = 'PaymentError';
        this.orderId = orderId;
        this.gateway = gateway;
    }
}

async function processPayment(orderId) {
    try {
        const response = await fetch(url, { method: 'POST', body: payload });
        if (!response.ok) {
            throw new PaymentError(`gateway returned ${response.status}`, {
                orderId,
                gateway: gatewayName,
            });
        }
        return await response.json();
    } catch (err) {
        if (err instanceof TypeError) {
            throw new PaymentError('gateway unreachable', {
                orderId,
                gateway: gatewayName,
                cause: err,
            });
        }
        throw err;
    }
}
```

### Python

```python
# ✅ 特定异常 + 上下文 + 异常链
try:
    response = http_client.post(url, data=payload)
    response.raise_for_status()
except requests.ConnectionError as e:
    raise PaymentGatewayError(f"cannot reach {gateway_name}") from e
except requests.HTTPError as e:
    if response.status_code == 429:
        raise RateLimitError(f"rate limited by {gateway_name}") from e
    raise PaymentGatewayError(f"HTTP {response.status_code} from {gateway_name}") from e
```

### Java

```java
// ✅ 特定异常 + 上下文 + 原因链
try {
    var response = httpClient.send(request, BodyHandlers.ofString());
    if (response.statusCode() == 404) {
        throw new OrderNotFoundException(orderId);
    }
} catch (IOException e) {
    throw new PaymentGatewayException(
        "gateway unreachable: " + gatewayUrl, e);
}
```

### Go

```go
// ✅ 错误包装 + 上下文 + %w 保留链
result, err := client.Do(req)
if err != nil {
    return fmt.Errorf("payment gateway %s request failed: %w", gatewayName, err)
}
defer result.Body.Close()

if result.StatusCode == http.StatusNotFound {
    return fmt.Errorf("order %d not found: %w", orderID, ErrNotFound)
}
```

---

## Review Checklist

### 核心检查
- [ ] 没有空 catch 块或静默忽略错误
- [ ] 错误信息包含操作描述和关键参数
- [ ] 使用特定错误类型（非通用 Error/Exception）
- [ ] 异常链保留（`cause` / `from` / `%w`）
- [ ] 前置条件在操作开始前验证（fail fast）

### 架构检查
- [ ] 定义了清晰的错误层次（应用/模块/基础设施）
- [ ] 全局异常处理器捕获未处理错误
- [ ] API 边界将内部错误转换为适当的 HTTP 状态码

### 日志检查
- [ ] 错误日志包含结构化上下文
- [ ] 没有记录敏感信息（密码、token、PII）
- [ ] 日志级别使用正确（ERROR vs WARN vs INFO）

### 语言特定（JavaScript/Node.js）
- [ ] Promise 链和`await`都有对应的 catch/try
- [ ] 自定义错误使用 `{ cause }` 选项保留原始错误
- [ ] 新错误类扩展现有 `AppError` 基类，而不是抛出裸 `Error`
