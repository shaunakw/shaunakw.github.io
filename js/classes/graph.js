const startDate = new Date();
startDate.setHours(8, 15, 0, 0);
const endDate = new Date(startDate.valueOf());
endDate.setHours(14, 45, 0, 0);
const nextDay = new Date(startDate.valueOf());
nextDay.setDate(nextDay.getDate() + 1);

function getClasses(accessToken) {
    const todayParams = {
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        $select: 'subject,start,end,isAllDay',
        $filter: 'categories/any(c:c eq \'BCP Schedule\')'
    };
    graphApi('/me/calendarView', todayParams, accessToken, function (json) {
        const order = document.getElementById('today-order');
        const classes = document.getElementById('today');
        if (json.value.length > 0) {
            for (const i of json.value) {
                if (i.isAllDay) {
                    order.innerHTML = 'Today: ' + i.subject;
                } else {
                    classes.appendChild(classRow(i.subject, new Date(i.start.dateTime), new Date(i.end.dateTime)));
                }
            }
        } else {
            order.innerHTML = 'Hooray!! No classes today!'
        }
    });

    const nextParams = {
        $select: 'subject,start,end,isAllDay',
        $filter: `categories/any(c:c eq 'BCP Schedule') and start/dateTime ge '${nextDay.getFullYear()}-${nextDay.getMonth() + 1}-${nextDay.getDate()}'`,
        $orderby: 'end/dateTime',
        $top: 7
    };
    graphApi('/me/events', nextParams, accessToken, function(json) {
        const order = document.getElementById('next-order');
        const classes = document.getElementById('next');
        const homework = document.getElementById('hw-list');
        for (const i of json.value) {
            const start = new Date(i.start.dateTime);
            const end = new Date(i.end.dateTime);
            const due = new Date(end.valueOf());
            due.setDate(due.getDate() - 1);
            due.setHours(23, 59, 59, 999);

            if (i.isAllDay) {
                order.innerHTML = `Next Class Day (${start.getMonth() + 1}-${start.getDate()}): ${i.subject}`;
                break;
            } else {
                classes.appendChild(classRow(i.subject, start, end));
                homework.appendChild(hwRow(i.subject, due))
            }
        }
    });
}

let ready = false;

function graphApi(endpoint, params, accessToken, completion) {
    let url = `https://graph.microsoft.com/v1.0${endpoint}?`;
    for (const p in params) {
        url += `${p}=${params[p]}&`;
    }

    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            const json = JSON.parse(xhttp.responseText);
            completion(json);
            if (ready) {
                showClasses()
            } else {
                ready = true
            }
        }
    };
    xhttp.open('GET', url, true);
    xhttp.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhttp.setRequestHeader('Prefer', 'outlook.timezone="America/Los_Angeles"');
    xhttp.send();
}

function classRow(subj, start, end) {
    const subject = subj.split(' - P');
    const tr = document.createElement('tr');

    const startTime = hourMinute(start);
    const endTime = hourMinute(end);

    tr.innerHTML = `<td>Period ${subject[1]} - ${subject[0]}</td><td>${startTime} - ${endTime}</td>`;
    return tr;
}

function hwRow(subj, due) {
    const subject = subj.split(' - P');
    const li = document.createElement('li');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.onchange = () => setCookie(subject[1], input.checked, due);
    input.checked = getCookie(subject[1]) === 'true';

    li.innerHTML = `Period ${subject[1]} - ${subject[0]}  `;
    li.appendChild(input);
    return li;
}

function hourMinute(date) {
    const hh = (date.getHours() - 1) % 12 + 1;
    let mm = date.getMinutes();
    if (mm < 10) mm = '0' + mm;
    return `${hh}:${mm}`;
}