import { ProcessTaskFromModule } from '@src/process/index.js'
import { TaskState } from '@fsm/task.js'
import { getErrorPromise } from 'return-style'
import { pass } from '@blackglory/pass'
import { getFixturePath } from '@test/utils.js'
import { delay } from 'extra-promise'

describe('ProcessTask', () => {
  describe('init', () => {
    describe('module does not exist', () => {
      it('throws Error', async () => {
        const task = new ProcessTaskFromModule(getFixturePath('not-exist.js'))

        try {
          const err = await getErrorPromise(task.init())

          expect(err).toBeInstanceOf(Error)
        } finally {
          task.destroy()
        }
      })
    })

    describe.each([
      'commonjs/bad.cjs'
    , 'esm/bad.js'
    ])('bad module (%s)', filename => {
      it('throws Error', async () => {
        const task = new ProcessTaskFromModule(getFixturePath(filename))

        try {
          const err = await getErrorPromise(task.init())

          expect(err).toBeInstanceOf(Error)
        } finally {
          task.destroy()
        }
      })
    })

    test.each([
      'commonjs/stopable.cjs'
    , 'esm/stopable.js'
    ])('created (%s)', filename => {
      const task = new ProcessTaskFromModule(getFixturePath(filename))

      expect(task.getStatus()).toBe(TaskState.Created)
    })

    test.each([
      'commonjs/stopable.cjs'
    , 'esm/stopable.js'
    ])('ready (%s)', async filename => {
      const task = new ProcessTaskFromModule(getFixturePath(filename))

      try {
        await task.init()

        expect(task.getStatus()).toBe(TaskState.Ready)
      } finally {
        task.destroy()
      }
    })
  })

  describe('run', () => {
    test.each([
      'commonjs/stopable.cjs'
    , 'esm/stopable.js'
    ])('running (%s)', async filename => {
      const task = new ProcessTaskFromModule(getFixturePath(filename))
      await task.init()

      try {
        task.run(undefined).catch(pass)
        await delay(1000)

        expect(task.getStatus()).toBe(TaskState.Running)
      } finally {
        await task.abort()
        task.destroy()
      }
    })

    test.each([
      'commonjs/completed.cjs'
    , 'esm/completed.js'
    ])('completed (%s)', async filename => {
      const task = new ProcessTaskFromModule(getFixturePath(filename))
      await task.init()

      try {
        const result = await task.run(undefined)

        expect(task.getStatus()).toBe(TaskState.Completed)
        expect(result).toBe('result')
      } finally {
        task.destroy()
      }
    })

    test.each([
      'commonjs/error.cjs'
    , 'esm/error.js'
    ])('error (%s)', async filename => {
      const task = new ProcessTaskFromModule(getFixturePath(filename))
      await task.init()

      try {
        const err = await getErrorPromise(task.run(undefined))

        expect(err).toBeInstanceOf(Error)
        expect(task.getStatus()).toBe(TaskState.Error)
      } finally {
        task.destroy()
      }
    })
  })

  describe('abort', () => {
    test.each([
      'commonjs/stopable.cjs'
    , 'esm/stopable.js'
    ])('stopping (%s)', async filename => {
      const task = new ProcessTaskFromModule(getFixturePath(filename))
      await task.init()

      task.run(undefined).catch(pass)
      await delay(1000)
      task.abort().then(() => task.destroy())

      expect(task.getStatus()).toBe(TaskState.Stopping)
    })

    test.each([
      'commonjs/stopable.cjs'
    , 'esm/stopable.js'
    ])('stopped (%s)', async filename => {
      const task = new ProcessTaskFromModule(getFixturePath(filename))
      await task.init()

      try {
        task.run(undefined).catch(pass)
        await delay(1000)
        await task.abort()

        expect(task.getStatus()).toBe(TaskState.Stopped)
      } finally {
        task.destroy()
      }
    })

    test.each([
      'commonjs/error-while-stopping.cjs'
    , 'esm/error-while-stopping.js'
    ])('error (%s)', async filename => {
      const task = new ProcessTaskFromModule(getFixturePath(filename))
      await task.init()

      try {
        task.run(undefined).catch(pass)
        await delay(1000)
        const err = await getErrorPromise(task.abort())

        expect(err).toBeInstanceOf(Error)
        expect(task.getStatus()).toBe(TaskState.Stopped)
      } finally {
        task.destroy()
      }
    })
  })
})
