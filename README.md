APNG-canvas
==============

Библиотека для отображения Animated PNG в браузерах, которые поддерживают canvas (т. е. в Google Chrome, Internet Explorer 9, Apple Safari).

Работающие примеры: http://davidmz.github.com/apng-canvas/ (общий вес изображений — около 3 Мб)

Обсуждение в ЖЖ: http://david-m.livejournal.com/tag/apng-canvas

API
-----------

Бибилиотека создаёт глобальный объект **APNG**, имеющий несколько методов. Все методы работают асинхронно, большинство принимаeт необязательный callback-аргумент. Методы должны вызываться после загрузки DOM-дерева.

Для тех, кому удобнее deferred-вызовы, методы возвращают *promise*-объекты. Если на странице присутствует jQuery, то используются его [promises](http://api.jquery.com/category/deferred-object/), в противном случае используется совместимый интерфейс, поддерживающий методы `done`, `fail`, `then` и `always`. В случае успешного выполнения метода, вызывается `callback` и обработчики `done` (с одинаковыми параметрами), в случае ошибки вызываются обработчики `fail` с сообщением об ошибке.

### APNG.ifNeeded(callback?)

`callback` вызывается без аргументов, и только в том случае, если браузер поддерживает `canvas`
и не поддерживает `APNG`. Только в этом случае имеет смысл применение этой библиотеки.
Остальные методы (кроме `checkNativeFeatures`) должны вызываться из `callback`-а.

### APNG.animateImage(img)

Этот метод вызывается без `callback`. Если `img.src` содержит ссылку на корректный APNG-файл, то метод создаёт `canvas`, в котором проигрывается APNG-анимация.
Далее метод выбирает оптимальную стратегию анимации в зависимости от браузера:

*   Для браузеров на базе `webkit` (Chrome и Safari):
    `src` исходного изображения заменяется на прозрачный gif и к нему добавляется фоновое изображение,
    в котором проигрывается анимация. Это позволяет сохранить объект `img` без изменения,
    в том числе сохраняются все его атрибуты и обработчики событий.
*   Для остальных браузеров (Internet Explorer 9):
    действует аналогично методу `replaceImage` (см. ниже) — исходный объект `img` заменяется на объект `canvas` с анимацией.

### APNG.replaceImage(img)

Этот метод вызывается без `callback`. Заменяет элемент `img` (`HTMLImageElement`) на `canvas` с анимацией. Замена происходит только если `img` содержит корректный APNG-файл.
При замене сохраняются атрибуты элемента `img`. Если в системе присутствует jQuery, то сохраняются обработчики событий.

Этот метод работает одинаково во всех браузерах.

### APNG.createAPNGCanvas(url, callback?)

Загружает PNG-файл по данному `url`, разбирает его, создаёт элемент `canvas` и запускает анимацию.

`callback` вызывается только если полученные данные являются корректным APNG-файлом. Аргумент — созданный элемент `canvas`, в котором проигрывается анимация. Элемент не включён в DOM-дерево, это нужно сделать вручную.

### APNG.checkNativeFeatures(callback?)

Проверяет, поддерживает ли браузер `APNG` и `canvas`. Может вызываться независимо от прочих методов. В `callback` передаётся объект с двумя булевыми полями: `apng` и `canvas`. True в любом поле означает поддержку браузером соответствующей технологии.


Пример использования
--------------------

    APNG.ifNeeded(function() {
        for (var i = 0; i < document.images.length; i++) {
            if (/\.png$/i.test(img.src)) APNG.animateImage(img);
        }
    });


Ограничения
-----------

Поскольку изображения загружаются при помощи `XMLHttpRequest`, то домен, на котором расположена картинка, должен быть тем же, что и домен, на котором расположена страничка.

Если домены разные, то в Chrome/Safari можно использовать [CORS](http://www.w3.org/TR/cors/ "Cross-Origin Resource Sharing"), настроив сервер картинок на отдачу заголовка `Access-Control-Allow-Origin: *`.

К сожалению, применить CORS в случае с IE, по видимому, невозможно, так как соотв. объект `XDomainRequest` не позволяет получить ответ в виде двоичных данных (`XMLHttpRequest` позволяет это сделать через свойство `responseBody`).

По той же причине (использование `XMLHttpRequest`) библиотека не будет работать с локальной машины (по протоколу file://).